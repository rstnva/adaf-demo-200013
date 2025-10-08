'use client';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';

export interface TvlHeatmapData {
  protocol: string;
  tvl: number;
  change7d: number;
  change30d: number;
  category: string;
  chain: string;
}

interface StablecoinFlowData {
  token: string;
  netFlow24h: number;
  netFlow7d: number;
  totalSupply: number;
  timestamp: string;
}

export function useOnchain() {
  const { timezone } = useUIStore();

  // TVL Heatmap data
  const tvlHeatmapQuery = useQuery({
    queryKey: ['onchain', 'tvl-heatmap', timezone],
    queryFn: async (): Promise<TvlHeatmapData[]> => {
      const params = new URLSearchParams({
        days: '7', // Default to 7 days, can be made dynamic
        timezone
      });
      
      const response = await fetch(`/api/read/onchain/tvl-heatmap?${params}`);
      if (!response.ok) {
        throw new Error(`TVL Heatmap API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 120_000, // 2 minutes
    retry: 1,
  });

  // Stablecoin flows (placeholder for future implementation)
  const stablecoinFlowsQuery = useQuery({
    queryKey: ['onchain', 'stablecoin-flows', timezone],
    queryFn: async (): Promise<StablecoinFlowData[]> => {
      // Placeholder - return mock data until endpoint is implemented
      return [
        {
          token: 'USDT',
          netFlow24h: 45_000_000,
          netFlow7d: 280_000_000,
          totalSupply: 120_000_000_000,
          timestamp: new Date().toISOString()
        },
        {
          token: 'USDC',
          netFlow24h: -12_000_000,
          netFlow7d: 95_000_000,
          totalSupply: 85_000_000_000,
          timestamp: new Date().toISOString()
        }
      ];
    },
    staleTime: 120_000, // 2 minutes
    retry: 1,
  });

  // TVL Heatmap with different time periods
    // Helper function to get TVL data for specific time periods
    const getTvlHeatmapByDays = async (days: 7 | 14 | 30): Promise<TvlHeatmapData[]> => {
      const params = new URLSearchParams({
        days: days.toString(),
        timezone
      });
    
      const response = await fetch(`/api/read/onchain/tvl-heatmap?${params}`);
      if (!response.ok) {
        throw new Error(`TVL Heatmap API error: ${response.status}`);
      }
      return response.json();
    };

  return {
    tvlHeatmap: {
      data: tvlHeatmapQuery.data,
      isLoading: tvlHeatmapQuery.isLoading,
      error: tvlHeatmapQuery.error,
      refetch: tvlHeatmapQuery.refetch,
    },
    stablecoinFlows: {
      data: stablecoinFlowsQuery.data,
      isLoading: stablecoinFlowsQuery.isLoading,
      error: stablecoinFlowsQuery.error,
      refetch: stablecoinFlowsQuery.refetch,
    },
    getTvlHeatmapByDays,
    isLoading: tvlHeatmapQuery.isLoading || stablecoinFlowsQuery.isLoading,
    error: tvlHeatmapQuery.error || stablecoinFlowsQuery.error,
  };
}