// ================================================================================================
// Rate Limiting Middleware - Next.js API Route Protection
// ================================================================================================
// Middleware function to apply rate limiting to API routes
// Integrates with Prometheus metrics for monitoring
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter, getRateLimitForRoute, RATE_LIMIT_SKIP_PATHS } from '@/server/rateLimit';

// Prometheus metrics (will be implemented)
let rateLimitBlockCounter: any = null;

try {
  // Initialize counter when available
  // rateLimitBlockCounter = new Counter({
  //   name: 'adaf_rate_limit_block_total',
  //   help: 'Total number of requests blocked by rate limiting',
  //   labelNames: ['route', 'ip']
  // });
} catch (error) {
  console.warn('Prometheus metrics not available for rate limiting');
}

/**
 * Rate limiting middleware for API routes
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  const pathname = new URL(request.url).pathname;
  
  // Skip rate limiting for excluded paths
  if (RATE_LIMIT_SKIP_PATHS.some(skip => pathname.startsWith(skip))) {
    return handler(request);
  }
  
  // Get rate limit for this route
  const requestsPerMinute = getRateLimitForRoute(pathname);
  
  // Skip if no rate limit configured
  if (requestsPerMinute === 0) {
    return handler(request);
  }
  
  try {
    const rateLimiter = getRateLimiter();
    const clientIP = getClientIP(request);
    const routePattern = rateLimiter.getRoutePattern(pathname);
    
    // Check rate limit
    const result = await rateLimiter.checkLimit(clientIP, routePattern, requestsPerMinute);
    
    if (!result.allowed) {
      // Increment metrics if available
      if (rateLimitBlockCounter) {
        rateLimitBlockCounter.labels({ route: routePattern, ip: clientIP }).inc();
      }
      
      console.warn(`Rate limit exceeded for IP ${clientIP} on route ${routePattern}`);
      
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: 'rate_limit',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(requestsPerMinute),
            'X-RateLimit-Remaining': String(result.remainingTokens),
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000))
          }
        }
      );
    }
    
    // Request allowed, add rate limit headers
    const response = await handler(request);
    
    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', String(requestsPerMinute));
    response.headers.set('X-RateLimit-Remaining', String(result.remainingTokens));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
    
    return response;
    
  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    // Fail open - allow request if rate limiting fails
    return handler(request);
  }
}

/**
 * Helper function to get client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers for IP detection
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  // Fallback for development
  return '127.0.0.1';
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 */
export function rateLimit(requestsPerMinute?: number) {
  return function <T extends (...args: any[]) => Promise<NextResponse> | NextResponse>(
    handler: T
  ) {
    return async function (request: NextRequest, ...args: any[]): Promise<NextResponse> {
      // Use custom rate limit if provided
      if (requestsPerMinute !== undefined) {
        const rateLimiter = getRateLimiter();
        const clientIP = getClientIP(request);
        const pathname = new URL(request.url).pathname;
        const routePattern = rateLimiter.getRoutePattern(pathname);
        
        const result = await rateLimiter.checkLimit(clientIP, routePattern, requestsPerMinute);
        
        if (!result.allowed) {
          return new NextResponse(
            JSON.stringify({
              ok: false,
              error: 'rate_limit',
              message: 'Too many requests. Please try again later.'
            }),
            {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
      
      return handler(request, ...args);
    };
  };
}

/**
 * Decorator for API route methods
 */
export function RateLimit(requestsPerMinute: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const rateLimiter = getRateLimiter();
      const clientIP = getClientIP(request);
      const pathname = new URL(request.url).pathname;
      const routePattern = rateLimiter.getRoutePattern(pathname);
      
      const result = await rateLimiter.checkLimit(clientIP, routePattern, requestsPerMinute);
      
      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({
            ok: false,
            error: 'rate_limit',
            message: 'Too many requests. Please try again later.'
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      return originalMethod.apply(this, [request, ...args]);
    };
    
    return descriptor;
  };
}