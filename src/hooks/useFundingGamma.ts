'use client';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';

export interface FundingData {
  asset: string;
  exchange: string;
  rate: number;
  timestamp: string;
  change24h: number;
  change7d: number;
}

export interface GammaData {
  asset: string;
  tenor: string;
  strike: number;
  gamma: number;
  exposure: number;
  timestamp: string;
}

export function useFundingGamma() {
  const { selectedAssets, range, timezone } = useUIStore();

  // Funding rates data
  const fundingQuery = useQuery({
    queryKey: ['derivs', 'funding', selectedAssets, range, timezone],
    queryFn: async (): Promise<FundingData[]> => {
      const params = new URLSearchParams({
        asset: selectedAssets.join(','),
        days: range.replace('D', ''),
        timezone
      });
      
      const response = await fetch(`/api/read/derivs/funding?${params}`);
      if (!response.ok) {
        throw new Error(`Funding API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 120_000, // 2 minutes
    retry: 1,
  });

  // Gamma exposure data
  const gammaQuery = useQuery({
    queryKey: ['derivs', 'gamma', selectedAssets, timezone],
    queryFn: async (): Promise<GammaData[]> => {
      const params = new URLSearchParams({
        asset: selectedAssets.join(','),
        tenors: '7,14,30',
        timezone
      });
      
      const response = await fetch(`/api/read/derivs/gamma?${params}`);
      if (!response.ok) {
        throw new Error(`Gamma API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 120_000, // 2 minutes
    retry: 1,
  });

  return {
    funding: {
      data: fundingQuery.data,
      isLoading: fundingQuery.isLoading,
      error: fundingQuery.error,
      refetch: fundingQuery.refetch,
    },
    gamma: {
      data: gammaQuery.data,
      isLoading: gammaQuery.isLoading,
      error: gammaQuery.error,
      refetch: gammaQuery.refetch,
    },
    isLoading: fundingQuery.isLoading || gammaQuery.isLoading,
    error: fundingQuery.error || gammaQuery.error,
  };
}