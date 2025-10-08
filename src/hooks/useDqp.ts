'use client';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';

export interface DqpOverviewData {
  totalSources: number;
  healthySources: number;
  warningSources: number;
  failedSources: number;
  avgFreshness: number;
  lastUpdate: string;
  sources: Array<{
    id: string;
    source: string;
    status: 'ok' | 'warn' | 'fail';
    agentCode: string;
    type: string;
    lastTs: string;
    freshnessMin: number | null;
  }>;
}

export function useDqp() {
  const { timezone } = useUIStore();

  // DQP Overview - Always fresh, no cache
  const overviewQuery = useQuery({
    queryKey: ['dqp', 'overview', timezone],
    queryFn: async (): Promise<DqpOverviewData> => {
      const params = new URLSearchParams({
        timezone
      });
      
      const response = await fetch(`/api/read/dqp/overview?${params}`);
      if (!response.ok) {
        throw new Error(`DQP Overview API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache (TanStack Query v5)
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: 30_000, // Refetch every 30 seconds
    retry: 1,
  });

  return {
    overview: {
      data: overviewQuery.data,
      isLoading: overviewQuery.isLoading,
      error: overviewQuery.error,
      refetch: overviewQuery.refetch,
    },
    isLoading: overviewQuery.isLoading,
    error: overviewQuery.error,
  };
}