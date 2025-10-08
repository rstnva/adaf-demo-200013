import { Redis, RedisOptions } from 'ioredis';
import { logger } from '../logger';

// Cache configuration for different data types
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix: string;
  invalidateOn?: string[]; // Events that should invalidate this cache
  compression?: boolean; // Whether to compress stored data
  serialization?: 'json' | 'msgpack'; // Serialization method
}

export const CACHE_CONFIGS = {
  // Strategy data caching - frequently accessed but relatively stable
  strategies: {
    ttl: 900, // 15 minutes
    keyPrefix: 'strategy',
    invalidateOn: ['strategy_update', 'market_close', 'backtest_complete'],
    compression: true,
    serialization: 'json'
  } as CacheConfig,

  // Market data caching - high frequency updates
  marketData: {
    realtime: {
      ttl: 300, // 5 minutes for real-time data
      keyPrefix: 'market:realtime',
      invalidateOn: ['market_data_update'],
      compression: false, // Speed over space for real-time data
      serialization: 'json'
    } as CacheConfig,
    historical: {
      ttl: 3600, // 1 hour for historical data  
      keyPrefix: 'market:historical',
      invalidateOn: ['market_data_correction'],
      compression: true,
      serialization: 'json'
    } as CacheConfig,
    aggregated: {
      ttl: 7200, // 2 hours for aggregated data (OHLCV daily, etc.)
      keyPrefix: 'market:aggregated', 
      invalidateOn: ['end_of_day_processing'],
      compression: true,
      serialization: 'json'
    } as CacheConfig
  },

  // Portfolio data caching - user-specific, moderately dynamic
  portfolio: {
    positions: {
      ttl: 600, // 10 minutes
      keyPrefix: 'portfolio:positions',
      invalidateOn: ['trade_execution', 'position_update', 'market_close'],
      compression: true,
      serialization: 'json'
    } as CacheConfig,
    analytics: {
      ttl: 1800, // 30 minutes for calculated analytics
      keyPrefix: 'portfolio:analytics',
      invalidateOn: ['portfolio_rebalance', 'risk_calculation_complete'],
      compression: true,
      serialization: 'json'
    } as CacheConfig,
    performance: {
      ttl: 3600, // 1 hour for performance metrics
      keyPrefix: 'portfolio:performance',
      invalidateOn: ['end_of_day_processing', 'portfolio_benchmark_update'],
      compression: true,
      serialization: 'json'
    } as CacheConfig
  },

  // User session and preferences - long-lived but user-specific
  user: {
    session: {
      ttl: 86400, // 24 hours
      keyPrefix: 'user:session',
      invalidateOn: ['user_logout', 'session_expired'],
      compression: false,
      serialization: 'json'
    } as CacheConfig,
    preferences: {
      ttl: 604800, // 7 days
      keyPrefix: 'user:preferences',
      invalidateOn: ['preferences_update'],
      compression: false,
      serialization: 'json'  
    } as CacheConfig,
    watchlist: {
      ttl: 3600, // 1 hour
      keyPrefix: 'user:watchlist',
      invalidateOn: ['watchlist_update', 'symbol_delisting'],
      compression: true,
      serialization: 'json'
    } as CacheConfig
  },

  // API response caching - endpoint-specific
  api: {
    dashboard: {
      ttl: 300, // 5 minutes for dashboard data
      keyPrefix: 'api:dashboard',
      invalidateOn: ['market_data_update', 'portfolio_update'],
      compression: true,
      serialization: 'json'
    } as CacheConfig,
    reports: {
      ttl: 1800, // 30 minutes for generated reports
      keyPrefix: 'api:reports', 
      invalidateOn: ['report_regenerated', 'end_of_day_processing'],
      compression: true,
      serialization: 'json'
    } as CacheConfig,
    search: {
      ttl: 600, // 10 minutes for search results
      keyPrefix: 'api:search',
      invalidateOn: ['symbol_listing_update', 'strategy_catalog_update'],
      compression: true,
      serialization: 'json'
    } as CacheConfig
  }
};

// Redis connection configuration
const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Connection pool settings
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  
  // Performance optimizations
  commandTimeout: 5000,
  
  // Connection health monitoring
  family: 4, // IPv4
  connectTimeout: 10000,
  enableOfflineQueue: false,
  
  // Cluster configuration (if using Redis Cluster)
  enableReadyCheck: true
};

// Create Redis client instances
export const redisClient = new Redis(redisOptions);
export const redisPubClient = new Redis(redisOptions); // For publishing cache invalidation events  
export const redisSubClient = new Redis(redisOptions); // For subscribing to cache invalidation events

// Connection event handlers
redisClient.on('connect', () => {
  logger.info('Redis cache client connected');
});

redisClient.on('error', (error) => {
  logger.error('Redis cache client error:', { error: error.message, stack: error.stack });
});

redisClient.on('ready', () => {
  logger.info('Redis cache client ready');
});

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

// Cache key generation utilities
export class CacheKeyBuilder {
  static strategy(symbol: string, type: string, params?: Record<string, unknown>): string {
    const baseKey = `${CACHE_CONFIGS.strategies.keyPrefix}:${symbol}:${type}`;
    return params ? `${baseKey}:${this.hashParams(params)}` : baseKey;
  }

  static marketData(symbol: string, timeframe: string, type: 'realtime' | 'historical' | 'aggregated' = 'realtime'): string {
    return `${CACHE_CONFIGS.marketData[type].keyPrefix}:${symbol}:${timeframe}`;
  }

  static portfolio(userId: string, type: 'positions' | 'analytics' | 'performance', date?: string): string {
    const baseKey = `${CACHE_CONFIGS.portfolio[type].keyPrefix}:${userId}`;
    return date ? `${baseKey}:${date}` : baseKey;
  }

  static user(userId: string, type: 'session' | 'preferences' | 'watchlist', identifier?: string): string {
    const baseKey = `${CACHE_CONFIGS.user[type].keyPrefix}:${userId}`;
    return identifier ? `${baseKey}:${identifier}` : baseKey;
  }

  static api(endpoint: string, params?: Record<string, unknown>, userId?: string): string {
    const endpointType = this.getEndpointType(endpoint);
    let baseKey = `${CACHE_CONFIGS.api[endpointType].keyPrefix}:${endpoint}`;
    
    if (userId) {
      baseKey += `:${userId}`;
    }
    
    return params ? `${baseKey}:${this.hashParams(params)}` : baseKey;
  }

  private static hashParams(params: Record<string, unknown>): string {
    // Create a consistent hash of parameters for cache key uniqueness
    const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return Buffer.from(sortedParams).toString('base64').slice(0, 16); // First 16 chars of base64
  }

  private static getEndpointType(endpoint: string): keyof typeof CACHE_CONFIGS.api {
    if (endpoint.includes('dashboard')) return 'dashboard';
    if (endpoint.includes('report')) return 'reports';  
    if (endpoint.includes('search')) return 'search';
    return 'dashboard'; // Default fallback
  }
}

// Cache statistics and monitoring
export class CacheStats {
  private static stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };

  static recordHit(): void {
    this.stats.hits++;
  }

  static recordMiss(): void {
    this.stats.misses++;
  }

  static recordSet(): void {
    this.stats.sets++;
  }

  static recordDelete(): void {
    this.stats.deletes++;
  }

  static recordError(): void {
    this.stats.errors++;
  }

  static getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      totalRequests: total
    };
  }

  static resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };
  }
}

// Cache warming utilities  
export class CacheWarming {
  // Warm cache with commonly accessed data
  static async warmStrategies(): Promise<void> {
    logger.info('Warming strategy cache...');
    
    // This would typically load the most popular strategies
    const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
    
    for (const symbol of popularSymbols) {
      // Pre-load strategy data for popular symbols
      // Implementation would call actual strategy data loading functions
      logger.debug(`Warming cache for strategy symbol: ${symbol}`);
    }
  }

  static async warmMarketData(): Promise<void> {
    logger.info('Warming market data cache...');
    
    // Pre-load current market data for major symbols
    const majorSymbols = ['AAPL', 'SPY', 'QQQ', 'BTC-USD', 'ETH-USD'];
    
    for (const symbol of majorSymbols) {
      // Pre-load real-time and recent historical data
      logger.debug(`Warming cache for market data symbol: ${symbol}`);
    }
  }

  static async warmAll(): Promise<void> {
    logger.info('Starting cache warming process...');
    
    await Promise.allSettled([
      this.warmStrategies(),
      this.warmMarketData()
    ]);
    
    logger.info('Cache warming process completed');
  }
}

// Cache invalidation event handling
export class CacheInvalidation {
  private static invalidationPatterns = new Map<string, string[]>();

  static {
    // Build invalidation pattern map from cache configurations
    Object.values(CACHE_CONFIGS).forEach(config => {
      if (Array.isArray(config)) {
        config.forEach(subConfig => this.addInvalidationPatterns(subConfig));
      } else if (typeof config === 'object' && 'keyPrefix' in config) {
        this.addInvalidationPatterns(config);
      } else {
        Object.values(config).forEach(subConfig => this.addInvalidationPatterns(subConfig));
      }
    });

    // Subscribe to invalidation events
    this.setupEventSubscriptions();
  }

  private static addInvalidationPatterns(config: CacheConfig): void {
    if (config.invalidateOn) {
      config.invalidateOn.forEach(event => {
        if (!this.invalidationPatterns.has(event)) {
          this.invalidationPatterns.set(event, []);
        }
        this.invalidationPatterns.get(event)!.push(config.keyPrefix);
      });
    }
  }

  private static setupEventSubscriptions(): void {
    redisSubClient.psubscribe('cache:invalidate:*');
    
    redisSubClient.on('pmessage', (pattern, channel, message) => {
      const event = channel.replace('cache:invalidate:', '');
      this.handleInvalidationEvent(event, JSON.parse(message));
    });
  }

  static async invalidateByEvent(event: string, metadata?: unknown): Promise<void> {
    const prefixesToInvalidate = this.invalidationPatterns.get(event);
    
    if (prefixesToInvalidate) {
      logger.info(`Invalidating cache for event: ${event}, prefixes: ${prefixesToInvalidate.join(', ')}`);
      
      for (const prefix of prefixesToInvalidate) {
        await this.invalidateByPattern(`${prefix}:*`);
      }
      
      // Publish invalidation event for other instances
      await redisPubClient.publish(`cache:invalidate:${event}`, JSON.stringify(metadata || {}));
    }
  }

  static async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        const deletedCount = await redisClient.del(...keys);
        CacheStats.recordDelete();
        logger.debug(`Invalidated ${deletedCount} cache entries for pattern: ${pattern}`);
        return deletedCount;
      }
      return 0;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      CacheStats.recordError();
      return 0;
    }
  }

  private static async handleInvalidationEvent(event: string, metadata: unknown): Promise<void> {
    logger.debug(`Handling cache invalidation event: ${event}`, { metadata });
    
    // Process invalidation event (this instance already published it, so just log)
    const prefixesToInvalidate = this.invalidationPatterns.get(event);
    if (prefixesToInvalidate) {
      logger.debug(`Cache invalidation processed for prefixes: ${prefixesToInvalidate.join(', ')}`);
    }
  }
}

// Export Redis configuration for use in cache service
export { redisOptions };
export default redisClient;