import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '../cache/cache-service';

// Cache middleware configuration
export interface CacheMiddlewareOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string; // Custom key prefix
  varyBy?: string[]; // Headers to vary cache by (e.g., ['user-id', 'accept-language'])
  skipCache?: boolean; // Skip caching for this request
  tags?: string[]; // Cache tags for easier invalidation
  condition?: (req: NextRequest) => boolean; // Conditional caching
}

// Default cache options for different endpoint types
export const DEFAULT_CACHE_OPTIONS: Record<string, CacheMiddlewareOptions> = {
  '/api/strategies': {
    ttl: 900, // 15 minutes
    keyPrefix: 'api:strategies',
    varyBy: ['user-id'],
    tags: ['strategies', 'market-data']
  },
  '/api/portfolio': {
    ttl: 600, // 10 minutes  
    keyPrefix: 'api:portfolio',
    varyBy: ['user-id'],
    tags: ['portfolio', 'positions']
  },
  '/api/market-data': {
    ttl: 300, // 5 minutes
    keyPrefix: 'api:market-data',
    varyBy: ['symbol', 'timeframe'],
    tags: ['market-data']
  },
  '/api/dashboard': {
    ttl: 300, // 5 minutes
    keyPrefix: 'api:dashboard', 
    varyBy: ['user-id'],
    tags: ['dashboard', 'portfolio', 'strategies']
  },
  '/api/reports': {
    ttl: 1800, // 30 minutes
    keyPrefix: 'api:reports',
    varyBy: ['user-id', 'report-type'],
    tags: ['reports']
  }
};

/**
 * Generate cache key based on request characteristics
 */
function generateCacheKey(
  req: NextRequest,
  options: CacheMiddlewareOptions
): string {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Base key with prefix
  let key = options.keyPrefix || `api:${pathname.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Add path parameters
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 2) {
    // Include path parameters in key (e.g., /api/portfolio/123 -> portfolio:123)
    key += `:${pathSegments.slice(2).join(':')}`;
  }
  
  // Add query parameters (sorted for consistency)
  const searchParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  if (searchParams) {
    const queryHash = Buffer.from(searchParams).toString('base64').slice(0, 16);
    key += `:q:${queryHash}`;
  }
  
  // Add vary-by headers
  if (options.varyBy) {
    const varyValues = options.varyBy
      .map(header => {
        const value = req.headers.get(header) || 'none';
        return `${header}=${value}`;
      })
      .join('&');
    
    if (varyValues) {
      const varyHash = Buffer.from(varyValues).toString('base64').slice(0, 16);
      key += `:v:${varyHash}`;
    }
  }
  
  return key;
}

/**
 * Check if request should be cached
 */
function shouldCache(req: NextRequest, options: CacheMiddlewareOptions): boolean {
  // Skip caching if explicitly disabled
  if (options.skipCache) {
    return false;
  }
  
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }
  
  // Check custom condition
  if (options.condition && !options.condition(req)) {
    return false;
  }
  
  // Skip caching if no-cache header is present
  const cacheControl = req.headers.get('cache-control');
  if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
    return false;
  }
  
  return true;
}

/**
 * Parse cache-control header for client preferences
 */
function parseCacheControl(cacheControlHeader: string | null): {
  maxAge?: number;
  noCache: boolean;
  noStore: boolean;
} {
  if (!cacheControlHeader) {
    return { noCache: false, noStore: false };
  }
  
  const directives = cacheControlHeader.split(',').map(d => d.trim().toLowerCase());
  const result = {
    noCache: directives.includes('no-cache'),
    noStore: directives.includes('no-store'),
    maxAge: undefined as number | undefined
  };
  
  const maxAgeDirective = directives.find(d => d.startsWith('max-age='));
  if (maxAgeDirective) {
    const maxAge = parseInt(maxAgeDirective.split('=')[1]);
    if (!isNaN(maxAge)) {
      result.maxAge = maxAge;
    }
  }
  
  return result;
}

/**
 * Main cache middleware function
 */
export function createCacheMiddleware(
  options: CacheMiddlewareOptions = {}
) {
  return async function cacheMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // Merge default options with provided options
    const mergedOptions = {
      ...DEFAULT_CACHE_OPTIONS[pathname],
      ...options
    };
    
    // Check if we should cache this request
    if (!shouldCache(req, mergedOptions)) {
      return handler(req);
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey(req, mergedOptions);
    
    try {
      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      
      if (cached.hit && cached.data) {
        // Cache hit - return cached response
        const response = new NextResponse(JSON.stringify(cached.data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'X-Cache-TTL': cached.ttl?.toString() || '0',
            'Cache-Control': `public, max-age=${cached.ttl || 0}`,
            'ETag': `"${Buffer.from(JSON.stringify(cached.data)).toString('base64').slice(0, 16)}"`
          }
        });
        
        return response;
      }
      
      // Cache miss - execute handler
      const response = await handler(req);
      
      // Only cache successful responses
      if (response.status === 200) {
        try {
          const responseData = await response.clone().json();
          
          // Cache the response
          await cacheService.setApiResponse(
            pathname,
            responseData,
            Object.fromEntries(url.searchParams.entries()),
            req.headers.get('user-id') || undefined,
            {
              ttl: mergedOptions.ttl,
              tags: mergedOptions.tags
            }
          );
          
          // Add cache headers to response
          const newResponse = new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
              ...Object.fromEntries(response.headers.entries()),
              'X-Cache': 'MISS',
              'X-Cache-Key': cacheKey,
              'Cache-Control': `public, max-age=${mergedOptions.ttl || 0}`
            }
          });
          
          return newResponse;
          
        } catch (error) {
          // If we can't parse or cache the response, just return it
          console.error('Cache middleware error:', error);
          return response;
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('Cache middleware error:', error);
      
      // If caching fails, just execute the handler
      return handler(req);
    }
  };
}

/**
 * Cache invalidation middleware for POST/PUT/DELETE requests
 */
export function createCacheInvalidationMiddleware(
  options: {
    tags?: string[];
    patterns?: string[];
    events?: string[];
  } = {}
) {
  return async function cacheInvalidationMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    
    // Execute the handler first
    const response = await handler(req);
    
    // Only invalidate on successful mutations
    if (response.status >= 200 && response.status < 300) {
      try {
        // Invalidate by tags
        if (options.tags && options.tags.length > 0) {
          await cacheService.invalidateByTags(options.tags);
        }
        
        // Invalidate by patterns
        if (options.patterns) {
          for (const pattern of options.patterns) {
            await cacheService.invalidatePattern(pattern);
          }
        }
        
        // Invalidate by events  
        if (options.events) {
          for (const event of options.events) {
            await cacheService.invalidateByEvent(event);
          }
        }
        
        // Add cache invalidation headers
        const newResponse = new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'X-Cache-Invalidated': 'true',
            'X-Cache-Tags-Invalidated': options.tags?.join(',') || '',
            'X-Cache-Patterns-Invalidated': options.patterns?.join(',') || ''
          }
        });
        
        return newResponse;
        
      } catch (error) {
        console.error('Cache invalidation middleware error:', error);
      }
    }
    
    return response;
  };
}

/**
 * Conditional ETag middleware
 */
export function createETagMiddleware() {
  return async function etagMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    
    const response = await handler(req);
    
    // Only add ETags for successful GET responses
    if (req.method === 'GET' && response.status === 200) {
      try {
        const responseData = await response.clone().text();
        const etag = `"${Buffer.from(responseData).toString('base64').slice(0, 16)}"`;
        
        // Check if client has matching ETag
        const clientETag = req.headers.get('if-none-match');
        if (clientETag === etag) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              'ETag': etag,
              'Cache-Control': response.headers.get('cache-control') || 'public, max-age=300'
            }
          });
        }
        
        // Add ETag to response
        const newResponse = new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'ETag': etag
          }
        });
        
        return newResponse;
        
      } catch (error) {
        console.error('ETag middleware error:', error);
      }
    }
    
    return response;
  };
}

/**
 * Cache warming middleware - preload cache with popular data
 */
export function createCacheWarmingMiddleware(
  warmingStrategies: {
    [endpoint: string]: () => Promise<void>;
  }
) {
  return async function cacheWarmingMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // Execute handler first
    const response = await handler(req);
    
    // Warm cache asynchronously after responding
    if (warmingStrategies[pathname]) {
      // Don't await - let it run in background
      warmingStrategies[pathname]().catch(error => {
        console.error(`Cache warming error for ${pathname}:`, error);
      });
    }
    
    return response;
  };
}

/**
 * Cache metrics middleware - collect performance data
 */
export function createCacheMetricsMiddleware() {
  return async function cacheMetricsMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    
    const startTime = Date.now();
    const response = await handler(req);
    const endTime = Date.now();
    
    // Add performance headers
    const newResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-Response-Time': `${endTime - startTime}ms`,
        'X-Cache-Timestamp': new Date().toISOString()
      }
    });
    
    return newResponse;
  };
}

// Utility function to compose multiple middlewares
export function composeMiddlewares(
  ...middlewares: Array<(req: NextRequest, handler: (req: NextRequest) => Promise<NextResponse>) => Promise<NextResponse>>
) {
  if (middlewares.length === 0) {
    return (req: NextRequest, handler: (req: NextRequest) => Promise<NextResponse>) => handler(req);
  }
  
  if (middlewares.length === 1) {
    return middlewares[0];
  }
  
  return function composedMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    
    function chainMiddleware(index: number): (req: NextRequest) => Promise<NextResponse> {
      if (index >= middlewares.length) {
        return handler;
      }
      
      const middleware = middlewares[index];
      const nextHandler = chainMiddleware(index + 1);
      
      return (innerReq: NextRequest) => middleware(innerReq, nextHandler);
    }
    
    return chainMiddleware(0)(req);
  };
}

// Pre-configured middleware combinations
export const standardCacheMiddleware = composeMiddlewares(
  createCacheMetricsMiddleware(),
  createETagMiddleware(),
  createCacheMiddleware()
);

export const dashboardCacheMiddleware = composeMiddlewares(
  createCacheMetricsMiddleware(),
  createETagMiddleware(), 
  createCacheMiddleware({
    ttl: 300,
    tags: ['dashboard', 'portfolio', 'strategies'],
    varyBy: ['user-id']
  })
);

export const marketDataCacheMiddleware = composeMiddlewares(
  createCacheMetricsMiddleware(),
  createCacheMiddleware({
    ttl: 300,
    tags: ['market-data'],
    varyBy: ['symbol', 'timeframe']
  })
);