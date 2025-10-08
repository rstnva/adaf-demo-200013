'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { currency, percent, number } from '@/lib/format';
import { CurrentEtfMetrics, EtfType } from '@/lib/ssv';

interface EtfMetricsCardProps {
  type: EtfType;
  data: CurrentEtfMetrics | null;
  loading?: boolean;
  error?: Error | null;
}

export function EtfMetricsCard({ type, data, loading, error }: EtfMetricsCardProps) {
  const title = type === 'us-btc-spot' ? 'US Bitcoin Spot ETFs' : 'US Ethereum Spot ETFs';
  
  if (error) {
    return (
      <Card className="border-white/10 bg-slate-900/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <Badge variant="destructive">Error</Badge>
        </div>
        <p className="text-sm text-slate-400">{error.message}</p>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Total Net Assets',
      value: data ? currency(data.totalNetAssets.value, data.totalNetAssets.unit) : '—',
      loading: loading,
    },
    {
      label: 'Market Cap %',
      value: data ? percent(data.marketCapPercentage.value) : '—',
      loading: loading,
    },
    {
      label: type === 'us-btc-spot' ? 'BTC Holdings' : 'ETH Holdings',
      value: data 
        ? type === 'us-btc-spot' 
          ? `${number(data.btcHoldings?.value || 0)} BTC`
          : `${number(data.ethHoldings?.value || 0)} ETH`
        : '—',
      loading: loading,
    },
    {
      label: 'Daily Net Inflow',
      value: data ? currency(data.dailyNetInflow.value, data.dailyNetInflow.unit) : '—',
      loading: loading,
      trend: data ? (data.dailyNetInflow.value >= 0 ? 'positive' : 'negative') : undefined,
    },
    {
      label: 'Cumulative Net Inflow',
      value: data ? currency(data.cumulativeNetInflow.value, data.cumulativeNetInflow.unit) : '—',
      loading: loading,
      trend: data ? (data.cumulativeNetInflow.value >= 0 ? 'positive' : 'negative') : undefined,
    },
    {
      label: 'Daily Value Traded',
      value: data ? currency(data.dailyValueTraded.value, data.dailyValueTraded.unit) : '—',
      loading: loading,
    },
  ];

  return (
    <Card className="border-white/10 bg-slate-900/80 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          {loading && (
            <Badge variant="secondary" className="animate-pulse">
              Loading
            </Badge>
          )}
          {data && (
            <Badge variant="outline" className="text-xs">
              Updated: {new Date(data.updateTime).toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-1">
            <p className="text-sm text-slate-400">{metric.label}</p>
            <div className="flex items-center gap-2">
              {metric.loading ? (
                <div className="h-6 w-20 animate-pulse rounded bg-slate-700" />
              ) : (
                <p 
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    metric.trend === 'positive' 
                      ? 'text-green-400' 
                      : metric.trend === 'negative' 
                      ? 'text-red-400' 
                      : 'text-white'
                  }`}
                >
                  {metric.value}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!data && !loading && !error && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">No data available</p>
        </div>
      )}
    </Card>
  );
}