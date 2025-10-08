// ================================================================================================
// Rate Limiting Core System - Token Bucket with Redis Fallback
// ================================================================================================
// Production-grade rate limiting for ADAF Dashboard API routes
// In-memory token bucket with Redis persistence for distributed scenarios
// ================================================================================================

import { NextRequest } from 'next/server';

// Rate limit configuration
export interface RateLimitConfig {
  route: string;
  requestsPerMinute: number;
  keyPrefix?: string;
  skipPaths?: string[];
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetTime: number;
  error?: string;
}

// Token bucket for rate limiting
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per minute
}

// In-memory store with TTL
class InMemoryStore {
  private store = new Map<string, { data: TokenBucket; expires: number }>();
  
  get(key: string): TokenBucket | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, value: TokenBucket, ttlMs: number = 3600000): void {
    this.store.set(key, {
      data: value,
      expires: Date.now() + ttlMs
    });
  }
  
  delete(key: string): void {
    this.store.delete(key);
  }
  
  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) {
        this.store.delete(key);
      }
    }
  }
}

// Redis fallback (optional)
class RedisStore {
  private client: any = null;
  
  constructor() {
    // Initialize Redis client if available
    try {
      // Note: Implement Redis client initialization if needed
      // this.client = new Redis(process.env.REDIS_URL);
    } catch (error) {
      console.warn('Redis not available, using memory store only');
    }
  }
  
  async get(key: string): Promise<TokenBucket | null> {
    if (!this.client) return null;
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  async set(key: string, value: TokenBucket, ttlSeconds: number = 3600): Promise<void> {
    if (!this.client) return;
    
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
}

// Main rate limiter class
export class RateLimiter {
  private memoryStore = new InMemoryStore();
  private redisStore = new RedisStore();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.memoryStore.cleanup();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Check if request is within rate limit
   */
  async checkLimit(
    ip: string, 
    route: string, 
    requestsPerMinute: number
  ): Promise<RateLimitResult> {
    const key = `rl:${route}:${ip}`;
    const now = Date.now();
    
    try {
      // Try to get from memory first, then Redis
      let bucket = this.memoryStore.get(key) || await this.redisStore.get(key);
      
      // Initialize new bucket if not found
      if (!bucket) {
        bucket = {
          tokens: requestsPerMinute,
          lastRefill: now,
          capacity: requestsPerMinute,
          refillRate: requestsPerMinute
        };
      }
      
      // Refill tokens based on time elapsed
      const minutesElapsed = (now - bucket.lastRefill) / (60 * 1000);
      const tokensToAdd = Math.floor(minutesElapsed * bucket.refillRate);
      
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
      
      // Check if request is allowed
      if (bucket.tokens <= 0) {
        // Update stores
        this.memoryStore.set(key, bucket);
        await this.redisStore.set(key, bucket, 3600);
        
        return {
          allowed: false,
          remainingTokens: 0,
          resetTime: bucket.lastRefill + (60 * 1000), // Next minute
          error: 'rate_limit_exceeded'
        };
      }
      
      // Consume token
      bucket.tokens -= 1;
      
      // Update stores
      this.memoryStore.set(key, bucket);
      await this.redisStore.set(key, bucket, 3600);
      
      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        resetTime: bucket.lastRefill + (60 * 1000)
      };
      
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open for availability
      return {
        allowed: true,
        remainingTokens: requestsPerMinute,
        resetTime: now + (60 * 1000),
        error: 'rate_limit_error'
      };
    }
  }
  
  /**
   * Get client IP from request
   */
  getClientIP(request: NextRequest): string {
    // Try various headers for IP detection
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP;
    
    const cfIP = request.headers.get('cf-connecting-ip');
    if (cfIP) return cfIP;
    
    // Fallback to a default IP for development
    return '127.0.0.1';
  }
  
  /**
   * Parse route pattern from URL
   */
  getRoutePattern(pathname: string): string {
    // Normalize dynamic routes
    return pathname
      .replace(/\/\d+/g, '/[id]')
      .replace(/\/[a-f0-9-]{36}/g, '/[uuid]')
      .replace(/\/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g, '/[guid]');
  }
  
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}

// Rate limit configurations by route pattern
export const RATE_LIMIT_CONFIGS: Record<string, number> = {
  // Strict limits for sensitive operations
  '/api/actions/*': parseInt(process.env.RATE_ACTIONS_PER_MIN || '10'),
  '/api/control/*': parseInt(process.env.RATE_ACTIONS_PER_MIN || '10'),
  '/api/research/backtest/run': parseInt(process.env.RATE_RESEARCH_RUN_PER_MIN || '6'),
  '/api/generate/report/*': parseInt(process.env.RATE_REPORTS_PER_MIN || '5'),
  
  // Moderate limits for read operations
  '/api/read/*': parseInt(process.env.RATE_DEFAULT_PER_MIN || '120'),
  '/api/research/*': parseInt(process.env.RATE_DEFAULT_PER_MIN || '120'),
  
  // Default limit
  '*': parseInt(process.env.RATE_DEFAULT_PER_MIN || '120')
};

// Paths to skip rate limiting
export const RATE_LIMIT_SKIP_PATHS = [
  '/api/metrics',
  '/api/stream/alerts',
  '/api/healthz'
];

/**
 * Get rate limit for specific route
 */
export function getRateLimitForRoute(pathname: string): number {
  // Check skip paths
  if (RATE_LIMIT_SKIP_PATHS.some(skip => pathname.startsWith(skip))) {
    return 0; // No rate limit
  }
  
  // Check specific patterns
  for (const [pattern, limit] of Object.entries(RATE_LIMIT_CONFIGS)) {
    if (pattern === '*') continue;
    
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(pathname)) {
      return limit;
    }
  }
  
  // Default rate limit
  return RATE_LIMIT_CONFIGS['*'];
}