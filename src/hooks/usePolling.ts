// Generic polling hook with abort controller and error handling
import { useCallback, useEffect, useRef, useState } from 'react';

export interface PollingOptions {
  interval: number; // milliseconds
  immediate?: boolean; // Execute immediately on mount
  enabled?: boolean; // Enable/disable polling
}

export function usePolling<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  options: PollingOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { interval, immediate = true, enabled = true } = options;

  // Backoff and circuit breaker state
  const [backoff, setBackoff] = useState(interval);
  const [failCount, setFailCount] = useState(0);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [nextRetry, setNextRetry] = useState<number | null>(null);

  const execute = useCallback(async () => {
    if (!enabled || circuitOpen) return;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await fn(abortControllerRef.current.signal);
      setData(result);
      setLastUpdate(new Date());
      setFailCount(0);
      setBackoff(interval);
      setCircuitOpen(false);
      setNextRetry(null);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        setFailCount(f => f + 1);
        // Exponential backoff
        setBackoff(b => Math.min(b * 2, 10 * 60 * 1000));
        // Circuit breaker: open after 3 fails
        setCircuitOpen(failCount + 1 >= 3);
        if (failCount + 1 >= 3) {
          // Schedule next retry
          const retryMs = Math.min(backoff * 2, 10 * 60 * 1000);
          setNextRetry(Date.now() + retryMs);
          setTimeout(() => {
            setCircuitOpen(false);
            setFailCount(0);
            setBackoff(interval);
            execute();
          }, retryMs);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fn, enabled, circuitOpen, failCount, backoff, interval]);

  const start = useCallback(() => {
    if (!enabled) return;

    if (immediate) {
      execute();
    }

    intervalRef.current = setInterval(execute, backoff);
  }, [execute, backoff, immediate, enabled]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    
    return stop;
  }, [start, stop, enabled]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh,
    start,
    stop,
    backoff,
    failCount,
    circuitOpen,
    nextRetry,
  };
}