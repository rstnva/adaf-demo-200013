'use client';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';
import { buildAssetAwareKey, withStale, CACHE_CONFIGS } from '@/lib/utils/cache';

export interface KpiData {
  navUsd: number;
  navMxn: number;
  pnlUsd: number;
  pnlMxn: number;
  sharpe: number;
  maxDrawdown: number;
  asOf: string;
}

export interface AlertItem {
  count7d: number;
  alertsSeries: Array<{
    date: string;
    sev1: number;
    sev2: number;
    sev3: number;
    sev4: number;
  }>;
}

export function useKpis() {
  const { selectedAssets, range, currency, timezone, getAssetParams } = useUIStore();

  // KPI NAV data
  const navQuery = useQuery({
    queryKey: buildAssetAwareKey('kpis-nav', selectedAssets, range, currency, timezone),
    queryFn: async (): Promise<KpiData> => {
      const params = new URLSearchParams({
        assets: getAssetParams(),
        range,
        currency,
        timezone
      });
      
      const response = await fetch(`/api/read/kpi/nav?${params}`);
      if (!response.ok) {
        throw new Error(`KPI NAV API error: ${response.status}`);
      }
      return response.json();
    },
    ...withStale(CACHE_CONFIGS.STANDARD),
  });

  // Alerts 7D data
  const alertsQuery = useQuery({
    queryKey: buildAssetAwareKey('kpis-alerts7d', selectedAssets, '7D', currency, timezone),
    queryFn: async (): Promise<AlertItem> => {
      const params = new URLSearchParams({
        assets: getAssetParams(),
        range: '7D',
        timezone
      });
      
      const response = await fetch(`/api/read/kpi/alerts7d?${params}`);
      if (!response.ok) {
        throw new Error(`Alerts 7D API error: ${response.status}`);
      }
      return response.json();
    },
    ...withStale(CACHE_CONFIGS.STANDARD),
  });

  return {
    nav: {
      data: navQuery.data,
      isLoading: navQuery.isLoading,
      error: navQuery.error,
      refetch: navQuery.refetch,
    },
    alerts: {
      data: alertsQuery.data,
      isLoading: alertsQuery.isLoading,
      error: alertsQuery.error,
      refetch: alertsQuery.refetch,
    },
    isLoading: navQuery.isLoading || alertsQuery.isLoading,
    error: navQuery.error || alertsQuery.error,
  };
}