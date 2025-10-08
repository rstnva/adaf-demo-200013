'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAssetAwareParams } from '@/store/ui';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Activity,
  Shield,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface KpiData {
  nav: {
    value: number;
    change: number;
    changePercent: number;
  };
  pnlDaily: {
    value: number;
    change: number;
    changePercent: number;
  };
  pnlYtd: {
    value: number;
    change: number;
    changePercent: number;
  };
  var1d: {
    value: number;
    status: 'ok' | 'warning' | 'critical';
  };
  maxDrawdown90d: {
    value: number;
    status: 'ok' | 'warning' | 'critical';
  };
}

export function KpiStrip() {
  const { getQueryKey } = useAssetAwareParams();
  
  const { data: kpiData, isLoading, error } = useQuery<KpiData>({
    queryKey: getQueryKey('kpis'),
    queryFn: async () => {
      const response = await fetch('/api/read/kpi/portfolio');
      if (!response.ok) {
        throw new Error('Failed to fetch KPIs');
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (value: number, compact = false) => {
    if (compact && Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (compact && Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="adaf-card">
        <CardHeader className="adaf-card-header">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Portfolio KPIs
          </CardTitle>
        </CardHeader>
        <CardContent className="adaf-card-content">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="adaf-skeleton h-4 w-16"></div>
                <div className="adaf-skeleton h-8 w-24"></div>
                <div className="adaf-skeleton h-3 w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !kpiData) {
    return (
      <Card className="adaf-card">
        <CardContent className="adaf-card-content">
          <div className="adaf-empty-state">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Failed to load KPIs</p>
            <p className="text-sm">Check data connectivity</p>
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
            <Activity className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
          <div className="flex gap-2">
            <Link href="/risk">
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-1" />
                Risk Details
              </Button>
            </Link>
            <Link href="/pnl">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                PnL Buckets
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* NAV */}
          <div className="space-y-2">
            <div className="adaf-kpi-label">Net Asset Value</div>
            <div className="adaf-kpi">{formatCurrency(kpiData.nav.value)}</div>
            <div className={cn("flex items-center gap-1 text-sm", getChangeColor(kpiData.nav.change))}>
              {kpiData.nav.change >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{formatCurrency(Math.abs(kpiData.nav.change), true)}</span>
              <span>({formatPercent(kpiData.nav.changePercent)})</span>
            </div>
          </div>

          {/* Daily PnL */}
          <div className="space-y-2">
            <div className="adaf-kpi-label">Daily PnL</div>
            <div className={cn("adaf-kpi", getChangeColor(kpiData.pnlDaily.value))}>
              {formatCurrency(kpiData.pnlDaily.value)}
            </div>
            <div className={cn("flex items-center gap-1 text-sm", getChangeColor(kpiData.pnlDaily.change))}>
              {kpiData.pnlDaily.change >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>vs yesterday</span>
            </div>
          </div>

          {/* YTD PnL */}
          <div className="space-y-2">
            <div className="adaf-kpi-label">YTD PnL</div>
            <div className={cn("adaf-kpi", getChangeColor(kpiData.pnlYtd.value))}>
              {formatCurrency(kpiData.pnlYtd.value)}
            </div>
            <div className={cn("flex items-center gap-1 text-sm", getChangeColor(kpiData.pnlYtd.changePercent))}>
              <span>{formatPercent(kpiData.pnlYtd.changePercent)} return</span>
            </div>
          </div>

          {/* 1-Day VaR */}
          <div className="space-y-2">
            <div className="adaf-kpi-label">1-Day VaR (95%)</div>
            <div className="adaf-kpi">{formatCurrency(Math.abs(kpiData.var1d.value))}</div>
            <Badge className={getStatusColor(kpiData.var1d.status)}>
              {kpiData.var1d.status.toUpperCase()}
            </Badge>
          </div>

          {/* Max Drawdown */}
          <div className="space-y-2">
            <div className="adaf-kpi-label">Max DD (90d)</div>
            <div className="adaf-kpi text-red-600">
              {formatPercent(kpiData.maxDrawdown90d.value)}
            </div>
            <Badge className={getStatusColor(kpiData.maxDrawdown90d.status)}>
              {kpiData.maxDrawdown90d.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}