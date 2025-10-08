'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAssetAwareParams } from '@/store/ui';
import { 
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  BarChart3,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EtfFlowData {
  asset: 'BTC' | 'ETH';
  totalAum: number;
  dailyFlow: number;
  weeklyFlow: number;
  monthlyFlow: number;
  flowTrend: 'inflow' | 'outflow' | 'neutral';
  topEtfs: Array<{
    ticker: string;
    name: string;
    dailyFlow: number;
    aum: number;
  }>;
  lastUpdated: string;
}

export function EtfAutoswitchCard() {
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ETH'>('BTC');
  const { getQueryKey } = useAssetAwareParams();

  const { data: flowData, isLoading, error, refetch } = useQuery<EtfFlowData>({
    queryKey: getQueryKey(`etf-flows-${selectedAsset}`),
    queryFn: async () => {
      const response = await fetch(`/api/read/etf/flows?asset=${selectedAsset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ETF flows');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const formatCurrency = (value: number, compact = true) => {
    const absValue = Math.abs(value);
    if (compact) {
      if (absValue >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (absValue >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (absValue >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTrendColor = (trend: string, value: number) => {
    if (trend === 'inflow' || value > 0) return 'text-green-600';
    if (trend === 'outflow' || value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader className="adaf-card-header">
          <CardTitle>ETF Flows (Auto-switch)</CardTitle>
        </CardHeader>
        <CardContent className="adaf-card-content">
          <div className="space-y-4">
            <div className="adaf-skeleton h-8 w-32"></div>
            <div className="adaf-skeleton h-20 w-full"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="adaf-skeleton h-4 w-20"></div>
                  <div className="adaf-skeleton h-4 w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ETF Flows (Auto-switch)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/markets">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant={selectedAsset === 'BTC' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedAsset('BTC')}
          >
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
            Bitcoin ETFs
          </Button>
          <Button
            variant={selectedAsset === 'ETH' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedAsset('ETH')}
          >
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            Ethereum ETFs
          </Button>
        </div>
      </CardHeader>

      <CardContent className="adaf-card-content">
        {error ? (
          <div className="adaf-empty-state">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Failed to load ETF flow data</p>
          </div>
        ) : flowData ? (
          <div className="space-y-6">
            {/* Flow Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total AUM</div>
                <div className="text-xl font-bold">{formatCurrency(flowData.totalAum)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Daily Flow</div>
                <div className={cn("text-xl font-bold flex items-center justify-center gap-1", 
                  getTrendColor(flowData.flowTrend, flowData.dailyFlow))}>
                  {React.createElement(getTrendIcon(flowData.dailyFlow), { className: "h-5 w-5" })}
                  {formatCurrency(Math.abs(flowData.dailyFlow))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Weekly Flow</div>
                <div className={cn("text-xl font-bold flex items-center justify-center gap-1", 
                  getTrendColor('', flowData.weeklyFlow))}>
                  {React.createElement(getTrendIcon(flowData.weeklyFlow), { className: "h-5 w-5" })}
                  {formatCurrency(Math.abs(flowData.weeklyFlow))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Monthly Flow</div>
                <div className={cn("text-xl font-bold flex items-center justify-center gap-1", 
                  getTrendColor('', flowData.monthlyFlow))}>
                  {React.createElement(getTrendIcon(flowData.monthlyFlow), { className: "h-5 w-5" })}
                  {formatCurrency(Math.abs(flowData.monthlyFlow))}
                </div>
              </div>
            </div>

            {/* Flow Trend Badge */}
            <div className="flex justify-center">
              <Badge className={cn(
                "px-3 py-1 text-sm font-medium",
                flowData.flowTrend === 'inflow' && "bg-green-100 text-green-800 border-green-200",
                flowData.flowTrend === 'outflow' && "bg-red-100 text-red-800 border-red-200",
                flowData.flowTrend === 'neutral' && "bg-gray-100 text-gray-800 border-gray-200"
              )}>
                {flowData.flowTrend === 'inflow' && '⬆️ Net Inflows'}
                {flowData.flowTrend === 'outflow' && '⬇️ Net Outflows'}
                {flowData.flowTrend === 'neutral' && '⚖️ Balanced'}
              </Badge>
            </div>

            {/* Top ETFs */}
            <div>
              <h4 className="font-medium mb-3">Top ETFs by Daily Flow</h4>
              <div className="space-y-2">
                {flowData.topEtfs.slice(0, 5).map((etf, index) => (
                  <div key={etf.ticker} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{etf.ticker}</div>
                        <div className="text-sm text-gray-600">{etf.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-medium", getTrendColor('', etf.dailyFlow))}>
                        {formatCurrency(etf.dailyFlow)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(etf.aum)} AUM
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-center">
              <div className="adaf-timestamp">
                Last updated: {new Date(flowData.lastUpdated).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="adaf-skeleton h-40 w-full"></div>
        )}
      </CardContent>
    </Card>
  );
}

export default EtfAutoswitchCard;