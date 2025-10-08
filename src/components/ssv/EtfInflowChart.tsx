'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { currency, formatDate } from '@/lib/format';
import { HistoricalInflow, EtfType } from '@/lib/ssv';

interface EtfInflowChartProps {
  type: EtfType;
  data: HistoricalInflow[] | null;
  loading?: boolean;
  error?: Error | null;
}

export function EtfInflowChart({ type, data, loading, error }: EtfInflowChartProps) {
  const title = `${type === 'us-btc-spot' ? 'BTC' : 'ETH'} ETF Flow History`;

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

  const chartData = data?.map(item => ({
    ...item,
    date: formatDate(item.date, 'short'),
  })) || [];

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded border border-white/20 bg-slate-800/95 p-3 shadow-lg">
          <p className="text-sm font-medium text-white">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {currency(entry.value, 'USD')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-white/10 bg-slate-900/80 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {loading && (
          <Badge variant="secondary" className="animate-pulse">
            Loading
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-32 w-full animate-pulse rounded bg-slate-700/50" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-slate-400">No flow data available</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => currency(value, 'USD', true)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="totalNetInflow"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Total Net Inflow"
              />
              <Line
                type="monotone"
                dataKey="cumNetInflow"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="Cumulative Net Inflow"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-slate-400">Total Net Inflow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-slate-400">Cumulative Net Inflow</span>
          </div>
        </div>
        
        {data && data.length > 0 && (
          <p className="text-xs text-slate-500">
            Last {data.length} days • Updated {new Date().toLocaleTimeString()}
          </p>
        )}
      </div>
    </Card>
  );
}