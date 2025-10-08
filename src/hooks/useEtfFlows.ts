'use client';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';

export interface EtfFlowData {
  symbol: string;
  flowsUsd: number;
  flowsMxn: number;
  date: string;
  provider: string;
}

export interface EtfCompareData {
  btc: Array<{
    date: string;
    flows: number;
    cumulative: number;
  }>;
  eth: Array<{
    date: string;
    flows: number;
    cumulative: number;
  }>;
}

export interface EtfAutoswitchData {
  source: 'SSV' | 'DB';
  currentAllocation: {
    btc: number;
    eth: number;
  };
  recommendedAllocation: {
    btc: number;
    eth: number;
  };
  lastRebalance: string;
  confidence: number;
}

// Utility function for ETF autoswitch logic
async function getEtfAutoswitchData(): Promise<EtfAutoswitchData> {
  // Simulate the existing etfAutoswitch utility logic
  const sources = ['SSV', 'DB'] as const;
  const currentSource = sources[Math.floor(Date.now() / 30000) % 2]; // Switch every 30s
  
  return {
    source: currentSource,
    currentAllocation: {
      btc: 65,
      eth: 35
    },
    recommendedAllocation: {
      btc: currentSource === 'SSV' ? 70 : 60,
      eth: currentSource === 'SSV' ? 30 : 40
    },
    lastRebalance: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    confidence: currentSource === 'SSV' ? 0.87 : 0.92
  };
}

export function useEtfFlows() {
  const { selectedAssets, range, currency, timezone } = useUIStore();

  // ETF Flows data
  const flowsQuery = useQuery({
    queryKey: ['etf', 'flows', selectedAssets, range, currency, timezone],
    queryFn: async (): Promise<EtfFlowData[]> => {
      const params = new URLSearchParams({
        asset: selectedAssets.join('|'),
        days: range.replace('D', ''),
        provider: 'any',
        currency,
        timezone
      });
      
      const response = await fetch(`/api/read/etf/flow?${params}`);
      if (!response.ok) {
        throw new Error(`ETF Flows API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000, // 60 seconds
    retry: 1,
  });

  // ETF Compare (BTC vs ETH)
  const compareQuery = useQuery({
    queryKey: ['etf', 'compare', range, currency, timezone],
    queryFn: async (): Promise<EtfCompareData> => {
      const params = new URLSearchParams({
        range,
        currency,
        timezone
      });
      
      const response = await fetch(`/api/read/etf/flow2?${params}`);
      if (!response.ok) {
        throw new Error(`ETF Compare API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 120_000, // 2 minutes
    retry: 1,
  });

  // ETF Autoswitch data
  const autoswitchQuery = useQuery({
    queryKey: ['etf', 'autoswitch'],
    queryFn: getEtfAutoswitchData,
    staleTime: 30_000, // 30 seconds - frequent updates for source switching
    refetchInterval: 30_000,
    retry: 1,
  });

  return {
    flows: {
      data: flowsQuery.data,
      isLoading: flowsQuery.isLoading,
      error: flowsQuery.error,
      refetch: flowsQuery.refetch,
    },
    compare: {
      data: compareQuery.data,
      isLoading: compareQuery.isLoading,
      error: compareQuery.error,
      refetch: compareQuery.refetch,
    },
    autoswitch: {
      data: autoswitchQuery.data,
      isLoading: autoswitchQuery.isLoading,
      error: autoswitchQuery.error,
      refetch: autoswitchQuery.refetch,
    },
    isLoading: flowsQuery.isLoading || compareQuery.isLoading || autoswitchQuery.isLoading,
    error: flowsQuery.error || compareQuery.error || autoswitchQuery.error,
  };
}