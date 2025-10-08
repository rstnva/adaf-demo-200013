'use client';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';

export interface OpxOpportunity {
  id: string;
  title: string;
  type: 'arbitrage' | 'momentum' | 'mean_reversion' | 'funding' | 'basis';
  score: number;
  status: 'proposed' | 'ready' | 'live' | 'closed';
  estimatedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  timeHorizon: string;
  assets: string[];
  exchanges: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export function useOpx() {
  const { selectedAssets, timezone } = useUIStore();

  // Top scoring opportunities
  const topScoresQuery = useQuery({
    queryKey: ['opx', 'topScores', selectedAssets, timezone],
    queryFn: async (): Promise<OpxOpportunity[]> => {
      const params = new URLSearchParams({
        status: 'proposed',
        order: 'score',
        limit: '10',
        timezone
      });

      // Add asset filter if specific assets are selected
      if (selectedAssets.length > 0 && !selectedAssets.includes('ALL')) {
        params.set('assets', selectedAssets.join(','));
      }
      
      const response = await fetch(`/api/read/opx/list?${params}`);
      if (!response.ok) {
        throw new Error(`OP-X Top Scores API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000, // 60 seconds
    retry: 1,
  });

  // All opportunities with filters
  const getOpportunities = async (status?: string, limit?: number): Promise<OpxOpportunity[]> => {
    const params = new URLSearchParams({
      timezone
    });

    if (status) params.set('status', status);
    if (limit) params.set('limit', limit.toString());
    if (selectedAssets.length > 0 && !selectedAssets.includes('ALL')) {
      params.set('assets', selectedAssets.join(','));
    }
    
    const response = await fetch(`/api/read/opx/list?${params}`);
    if (!response.ok) {
      throw new Error(`OP-X Opportunities API error: ${response.status}`);
    }
    return response.json();
  };

  return {
    topScores: {
      data: topScoresQuery.data,
      isLoading: topScoresQuery.isLoading,
      error: topScoresQuery.error,
      refetch: topScoresQuery.refetch,
    },
    getOpportunities,
    isLoading: topScoresQuery.isLoading,
    error: topScoresQuery.error,
  };
}