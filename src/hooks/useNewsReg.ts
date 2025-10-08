'use client';

import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  impact: 'high' | 'medium' | 'low';
  topic: string;
  publishedAt: string;
  url: string;
  source: string;
}

export interface RegulationItem {
  id: string;
  title: string;
  jurisdiction: string;
  type: 'proposal' | 'law' | 'guidance' | 'consultation';
  effectiveDate: string;
  summary: string;
  impact: 'high' | 'medium' | 'low';
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'earnings' | 'economic' | 'regulatory' | 'crypto';
  importance: 'high' | 'medium' | 'low';
  description: string;
}

export function useNewsReg() {
  const { timezone } = useUIStore();

  // News data
  const newsQuery = useQuery({
    queryKey: ['news', timezone],
    queryFn: async (): Promise<NewsItem[]> => {
      const params = new URLSearchParams({
        limit: '20',
        timezone
      });
      
      const response = await fetch(`/api/read/news?${params}`);
      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000, // 60 seconds
    retry: 1,
  });

  // News with impact filter
  const getNewsByImpact = async (impact: 'high' | 'medium' | 'low'): Promise<NewsItem[]> => {
    const params = new URLSearchParams({
      impact,
      limit: '20',
      timezone
    });
    
    const response = await fetch(`/api/read/news?${params}`);
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }
    return response.json();
  };

  // Regulation calendar
  const regCalendarQuery = useQuery({
    queryKey: ['regulation', 'calendar', timezone],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const params = new URLSearchParams({
        days: '7',
        timezone
      });
      
      const response = await fetch(`/api/read/reg/calendar?${params}`);
      if (!response.ok) {
        // If endpoint doesn't exist, return mock data
        if (response.status === 404) {
          return [
            {
              id: '1',
              title: 'Fed Interest Rate Decision',
              date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              type: 'economic',
              importance: 'high',
              description: 'Federal Reserve announces interest rate decision'
            },
            {
              id: '2', 
              title: 'EU MiCA Regulation Implementation',
              date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              type: 'regulatory',
              importance: 'medium',
              description: 'Markets in Crypto-Assets regulation comes into effect'
            }
          ];
        }
        throw new Error(`Regulation Calendar API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000, // 60 seconds
    retry: 1,
  });

  // Regulation items
  const regulationQuery = useQuery({
    queryKey: ['regulation', 'items', timezone],
    queryFn: async (): Promise<RegulationItem[]> => {
      // Mock data until endpoint is implemented
      return [
        {
          id: '1',
          title: 'SEC Bitcoin ETF Guidelines Update',
          jurisdiction: 'US',
          type: 'guidance',
          effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          summary: 'Updated guidelines for Bitcoin ETF applications and compliance requirements',
          impact: 'high'
        },
        {
          id: '2',
          title: 'EU Stablecoin Reserves Requirements',
          jurisdiction: 'EU',
          type: 'law',
          effectiveDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          summary: 'New reserve requirements for stablecoin issuers in European Union',
          impact: 'medium'
        }
      ];
    },
    staleTime: 60_000, // 60 seconds
    retry: 1,
  });

  return {
    news: {
      data: newsQuery.data,
      isLoading: newsQuery.isLoading,
      error: newsQuery.error,
      refetch: newsQuery.refetch,
    },
    regulation: {
      data: regulationQuery.data,
      isLoading: regulationQuery.isLoading,
      error: regulationQuery.error,
      refetch: regulationQuery.refetch,
    },
    calendar: {
      data: regCalendarQuery.data,
      isLoading: regCalendarQuery.isLoading,
      error: regCalendarQuery.error,
      refetch: regCalendarQuery.refetch,
    },
    getNewsByImpact,
    isLoading: newsQuery.isLoading || regulationQuery.isLoading || regCalendarQuery.isLoading,
    error: newsQuery.error || regulationQuery.error || regCalendarQuery.error,
  };
}