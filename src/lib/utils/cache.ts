/**
 * Cache utilities for TanStack Query
 */

import { UseQueryOptions } from '@tanstack/react-query';

/**
 * Build consistent query keys for TanStack Query
 */
export function buildQueryKey(
  base: string, 
  params: Record<string, unknown> = {}
): string[] {
  // Filter out null/undefined values and convert to strings
  const cleanParams = Object.entries(params)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}:${String(value)}`)
    .sort(); // Sort for consistency
  
  return [base, ...cleanParams];
}

/**
 * Standard query options with stale time and retry configuration
 */
export function withStale<T>(opts: {
  staleTime: number;
  retry?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
}): Partial<UseQueryOptions<T>> {
  const {
    staleTime,
    retry = 1,
    gcTime = 5 * 60 * 1000, // 5 minutes default
    refetchOnWindowFocus = false,
  } = opts;

  return {
    staleTime,
    retry,
    gcTime,
    refetchOnWindowFocus,
  };
}

/**
 * Predefined cache configurations for different data types
 */
export const CACHE_CONFIGS = {
  // Real-time data (no cache)
  REAL_TIME: {
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  },
  
  // Fast refresh (30s)
  FAST: {
    staleTime: 30_000,
    gcTime: 2 * 60 * 1000,
  },
  
  // Standard refresh (60s) - KPIs, news
  STANDARD: {
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  },
  
  // Slow refresh (2min) - derivatives, onchain
  SLOW: {
    staleTime: 120_000,
    gcTime: 10 * 60 * 1000,
  },
  
  // Very slow refresh (5min) - static/reference data
  STATIC: {
    staleTime: 300_000,
    gcTime: 30 * 60 * 1000,
  },
} as const;

/**
 * Asset-aware query key builder that respects UI store state
 */
export function buildAssetAwareKey(
  base: string,
  assets: string[],
  range: string,
  currency: string,
  timezone: string,
  extraParams: Record<string, unknown> = {}
): string[] {
  return buildQueryKey(base, {
    assets: assets.join(','),
    range,
    currency,
    timezone,
    ...extraParams,
  });
}