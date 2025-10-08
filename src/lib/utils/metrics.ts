/**
 * API Performance Metrics utilities
 */

interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  error?: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Track API call performance
 */
export function trackApiCall<T>(
  endpoint: string, 
  method: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return apiCall()
    .then(result => {
      const duration = Date.now() - start;
      postApiMetric({
        endpoint,
        method,
        duration,
        status: 200,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
      });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      const status = error?.response?.status || error?.status || 500;
      
      postApiMetric({
        endpoint,
        method,
        duration,
        status,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
      });
      
      throw error; // Re-throw to maintain error handling
    });
}

/**
 * Post API metric to monitoring endpoint
 */
async function postApiMetric(metric: ApiMetric): Promise<void> {
  try {
    // Fire and forget - don't block main API calls
    fetch('/api/metrics/api/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    }).catch(error => {
      console.debug('Metrics posting error:', error);
    });
  } catch (error) {
    console.debug('Failed to post API metric:', error);
  }
}

/**
 * Cache hit/miss tracking
 */
export function trackCacheMetric(
  queryKey: string,
  hit: boolean,
  source: 'memory' | 'network' | 'stale'
): void {
  try {
    const metric = {
      queryKey: queryKey.slice(0, 100), // Limit key length
      hit,
      source,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
    };
    
    fetch('/api/metrics/cache/hit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    }).catch(error => {
      console.debug('Cache metrics error:', error);
    });
  } catch (error) {
    console.debug('Failed to track cache metric:', error);
  }
}

/**
 * Query error tracking
 */
export function trackQueryError(
  queryKey: string,
  error: Error,
  retryCount: number = 0
): void {
  try {
    const metric = {
      queryKey: queryKey.slice(0, 100),
      error: error.message.slice(0, 200),
      retryCount,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
    };
    
    fetch('/api/metrics/query/error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    }).catch(err => {
      console.debug('Query error tracking failed:', err);
    });
  } catch (err) {
    console.debug('Failed to track query error:', err);
  }
}

/**
 * Get session ID from sessionStorage
 */
function getSessionId(): string {
  try {
    return sessionStorage.getItem('adaf_session_id') || 'unknown';
  } catch {
    return 'unknown';
  }
}