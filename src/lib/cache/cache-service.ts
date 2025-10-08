import redisClient, { 
  CacheConfig, 
  CACHE_CONFIGS, 
  CacheKeyBuilder, 
  CacheStats,
  CacheInvalidation 
} from './redis-config';

// Type definitions for cache operations
export interface CacheOptions {
  ttl?: number; // Override default TTL
  compression?: boolean; // Override default compression
  tags?: string[]; // Tags for easier invalidation
}

export interface CacheResult<T> {
  data: T | null;
  hit: boolean;
  ttl?: number; // Remaining TTL in seconds
  size?: number; // Size of cached data in bytes
}

export interface CacheMetrics {
  hitRate: number;
  totalRequests: number;
  memoryUsage: number;
  activeKeys: number;
}

/**
 * Main cache service for ADAF Dashboard
 * Provides high-level caching operations with automatic key generation,
 * compression, serialization, and invalidation management.
 */
export class CacheService {
  private static instance: CacheService;
  
  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of CacheService
   */
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generic cache get operation
   */
  async get<T>(key: string, config?: CacheConfig): Promise<CacheResult<T>> {
    try {
      const cachedData = await redisClient.get(key);
      
      if (cachedData === null) {
        CacheStats.recordMiss();
        return { data: null, hit: false };
      }

      CacheStats.recordHit();
      
      let parsedData: T;
      try {
        parsedData = JSON.parse(cachedData);
      } catch (parseError) {
        // If parsing fails, treat as cache miss
        CacheStats.recordMiss();
        await redisClient.del(key); // Remove corrupted data
        return { data: null, hit: false };
      }

      // Get remaining TTL
      const ttl = await redisClient.ttl(key);
      
      return {
        data: parsedData,
        hit: true,
        ttl: ttl > 0 ? ttl : undefined,
        size: Buffer.byteLength(cachedData, 'utf8')
      };

    } catch (error) {
      console.error('Cache get error:', error);
      CacheStats.recordError();
      return { data: null, hit: false };
    }
  }

  /**
   * Generic cache set operation
   */
  async set<T>(
    key: string, 
    data: T, 
    config: CacheConfig, 
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const ttl = options?.ttl || config.ttl;
      const serializedData = JSON.stringify(data);
      
      if (ttl > 0) {
        await redisClient.setex(key, ttl, serializedData);
      } else {
        await redisClient.set(key, serializedData);
      }
      
      CacheStats.recordSet();
      
      // Add tags for easier invalidation if provided
      if (options?.tags) {
        await this.addTags(key, options.tags);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      CacheStats.recordError();
      return false;
    }
  }

  /**
   * Cache-aside pattern: get from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    config: CacheConfig,
    options?: CacheOptions
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.get<T>(key, config);
    
    if (cached.hit && cached.data !== null) {
      return cached.data;
    }

    // Cache miss - execute function and cache result
    try {
      const data = await fetchFunction();
      
      if (data !== null && data !== undefined) {
        await this.set(key, data, config, options);
      }
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet fetch function error:', error);
      return null;
    }
  }

  /**
   * Strategy-specific cache operations
   */
  async getStrategy(symbol: string, type: string, params?: Record<string, unknown>): Promise<CacheResult<unknown>> {
    const key = CacheKeyBuilder.strategy(symbol, type, params);
    return this.get(key, CACHE_CONFIGS.strategies);
  }

  async setStrategy(
    symbol: string, 
    type: string, 
    data: unknown, 
    params?: Record<string, unknown>,
    options?: CacheOptions
  ): Promise<boolean> {
    const key = CacheKeyBuilder.strategy(symbol, type, params);
    return this.set(key, data, CACHE_CONFIGS.strategies, options);
  }

  async getOrSetStrategy<T>(
    symbol: string,
    type: string,
    fetchFunction: () => Promise<T>,
    params?: Record<string, unknown>,
    options?: CacheOptions
  ): Promise<T | null> {
    const key = CacheKeyBuilder.strategy(symbol, type, params);
    return this.getOrSet(key, fetchFunction, CACHE_CONFIGS.strategies, options);
  }

  /**
   * Market data cache operations
   */
  async getMarketData(
    symbol: string, 
    timeframe: string, 
    type: 'realtime' | 'historical' | 'aggregated' = 'realtime'
  ): Promise<CacheResult<unknown>> {
    const key = CacheKeyBuilder.marketData(symbol, timeframe, type);
    return this.get(key, CACHE_CONFIGS.marketData[type]);
  }

  async setMarketData(
    symbol: string,
    timeframe: string,
    data: unknown,
    type: 'realtime' | 'historical' | 'aggregated' = 'realtime',
    options?: CacheOptions
  ): Promise<boolean> {
    const key = CacheKeyBuilder.marketData(symbol, timeframe, type);
    return this.set(key, data, CACHE_CONFIGS.marketData[type], options);
  }

  async getOrSetMarketData<T>(
    symbol: string,
    timeframe: string,
    fetchFunction: () => Promise<T>,
    type: 'realtime' | 'historical' | 'aggregated' = 'realtime',
    options?: CacheOptions
  ): Promise<T | null> {
    const key = CacheKeyBuilder.marketData(symbol, timeframe, type);
    return this.getOrSet(key, fetchFunction, CACHE_CONFIGS.marketData[type], options);
  }

  /**
   * Portfolio cache operations
   */
  async getPortfolio(
    userId: string,
    type: 'positions' | 'analytics' | 'performance',
    date?: string
  ): Promise<CacheResult<unknown>> {
    const key = CacheKeyBuilder.portfolio(userId, type, date);
    return this.get(key, CACHE_CONFIGS.portfolio[type]);
  }

  async setPortfolio(
    userId: string,
    type: 'positions' | 'analytics' | 'performance',
    data: unknown,
    date?: string,
    options?: CacheOptions
  ): Promise<boolean> {
    const key = CacheKeyBuilder.portfolio(userId, type, date);
    return this.set(key, data, CACHE_CONFIGS.portfolio[type], options);
  }

  async getOrSetPortfolio<T>(
    userId: string,
    type: 'positions' | 'analytics' | 'performance',
    fetchFunction: () => Promise<T>,
    date?: string,
    options?: CacheOptions
  ): Promise<T | null> {
    const key = CacheKeyBuilder.portfolio(userId, type, date);
    return this.getOrSet(key, fetchFunction, CACHE_CONFIGS.portfolio[type], options);
  }

  /**
   * API response cache operations
   */
  async getApiResponse(
    endpoint: string,
    params?: Record<string, unknown>,
    userId?: string
  ): Promise<CacheResult<unknown>> {
    const key = CacheKeyBuilder.api(endpoint, params, userId);
    const endpointType = this.getEndpointCacheType(endpoint);
    return this.get(key, CACHE_CONFIGS.api[endpointType]);
  }

  async setApiResponse(
    endpoint: string,
    data: unknown,
    params?: Record<string, unknown>,
    userId?: string,
    options?: CacheOptions
  ): Promise<boolean> {
    const key = CacheKeyBuilder.api(endpoint, params, userId);
    const endpointType = this.getEndpointCacheType(endpoint);
    return this.set(key, data, CACHE_CONFIGS.api[endpointType], options);
  }

  async getOrSetApiResponse<T>(
    endpoint: string,
    fetchFunction: () => Promise<T>,
    params?: Record<string, unknown>,
    userId?: string,
    options?: CacheOptions
  ): Promise<T | null> {
    const key = CacheKeyBuilder.api(endpoint, params, userId);
    const endpointType = this.getEndpointCacheType(endpoint);
    return this.getOrSet(key, fetchFunction, CACHE_CONFIGS.api[endpointType], options);
  }

  /**
   * Bulk cache operations
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    try {
      const results = await redisClient.mget(...keys);
      const resultMap = new Map<string, T | null>();
      
      for (let i = 0; i < keys.length; i++) {
        const result = results[i];
        if (result !== null) {
          try {
            resultMap.set(keys[i], JSON.parse(result));
            CacheStats.recordHit();
          } catch (parseError) {
            resultMap.set(keys[i], null);
            CacheStats.recordMiss();
          }
        } else {
          resultMap.set(keys[i], null);
          CacheStats.recordMiss();
        }
      }
      
      return resultMap;
    } catch (error) {
      console.error('Bulk cache get error:', error);
      CacheStats.recordError();
      return new Map();
    }
  }

  async setMultiple(entries: Map<string, { data: unknown; ttl: number }>): Promise<number> {
    try {
      const pipeline = redisClient.pipeline();
      let count = 0;
      
      for (const [key, { data, ttl }] of entries) {
        const serializedData = JSON.stringify(data);
        if (ttl > 0) {
          pipeline.setex(key, ttl, serializedData);
        } else {
          pipeline.set(key, serializedData);
        }
        count++;
      }
      
      await pipeline.exec();
      CacheStats.recordSet();
      return count;
    } catch (error) {
      console.error('Bulk cache set error:', error);
      CacheStats.recordError();
      return 0;
    }
  }

  /**
   * Cache invalidation operations
   */
  async invalidate(key: string): Promise<boolean> {
    try {
      const result = await redisClient.del(key);
      CacheStats.recordDelete();
      return result > 0;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      CacheStats.recordError();
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    return CacheInvalidation.invalidateByPattern(pattern);
  }

  async invalidateByEvent(event: string, metadata?: Record<string, unknown>): Promise<void> {
    return CacheInvalidation.invalidateByEvent(event, metadata);
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const keys = await redisClient.smembers(tagKey);
      
      if (keys.length > 0) {
        const deleted = await redisClient.del(...keys);
        totalInvalidated += deleted;
        await redisClient.del(tagKey); // Remove tag set
      }
    }
    
    return totalInvalidated;
  }

  /**
   * Cache metrics and monitoring
   */
  async getMetrics(): Promise<CacheMetrics> {
    try {
      const info = await redisClient.info('memory');
      const dbSize = await redisClient.dbsize();
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      return {
        ...CacheStats.getStats(),
        memoryUsage,
        activeKeys: dbSize
      };
    } catch (error) {
      console.error('Cache metrics error:', error);
      return {
        hitRate: 0,
        totalRequests: 0,
        memoryUsage: 0,
        activeKeys: 0
      };
    }
  }

  async getKeysByPattern(pattern: string, limit = 100): Promise<string[]> {
    try {
      // Use SCAN for better performance than KEYS in production
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const result = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', limit);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0' && keys.length < limit);
      
      return keys.slice(0, limit);
    } catch (error) {
      console.error('Get keys by pattern error:', error);
      return [];
    }
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await redisClient.ping();
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Utility methods
   */
  private getEndpointCacheType(endpoint: string): keyof typeof CACHE_CONFIGS.api {
    if (endpoint.includes('dashboard')) return 'dashboard';
    if (endpoint.includes('report')) return 'reports';
    if (endpoint.includes('search')) return 'search';
    return 'dashboard'; // Default fallback
  }

  private async addTags(key: string, tags: string[]): Promise<void> {
    const pipeline = redisClient.pipeline();
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, key);
      // Set TTL for tag sets to prevent memory leaks
      pipeline.expire(tagKey, 86400); // 24 hours
    }
    
    await pipeline.exec();
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

// Export for testing and advanced use cases
export default CacheService;