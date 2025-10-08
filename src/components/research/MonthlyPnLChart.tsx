'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

import { MonthlyPnL } from '@/types/research';

interface MonthlyPnLChartProps {
  data: MonthlyPnL[];
}

/**
 * Monthly PnL chart showing performance breakdown by month
 */
export function MonthlyPnLChart({ data }: MonthlyPnLChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No monthly data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = data.map((point) => {
    const [year, month] = point.ym.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
      month: 'short' 
    });
    
    return {
      month: `${monthName} ${year}`,
      ym: point.ym,
      pnl: point.pnlPct * 100, // Convert to percentage
      pnlFormatted: `${(point.pnlPct * 100).toFixed(2)}%`,
      fill: point.pnlPct >= 0 ? '#16a34a' : '#dc2626' // Green for positive, red for negative
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-md p-3">
          <p className="font-medium">{label}</p>
          <div className="flex items-center gap-2 mt-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.fill }}
            ></div>
            <span className="text-sm">
              Monthly PnL: {data.pnlFormatted}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const positiveMonths = chartData.filter(d => d.pnl > 0).length;
  const negativeMonths = chartData.filter(d => d.pnl < 0).length;
  const winRate = chartData.length > 0 ? (positiveMonths / chartData.length * 100).toFixed(1) : '0';
  const bestMonth = chartData.reduce((max, curr) => curr.pnl > max.pnl ? curr : max, chartData[0]);
  const worstMonth = chartData.reduce((min, curr) => curr.pnl < min.pnl ? curr : min, chartData[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Performance
          </span>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-green-600">
              Positive: {positiveMonths}
            </div>
            <div className="text-red-600">
              Negative: {negativeMonths}
            </div>
            <div className="font-medium">
              Win Rate: {winRate}%
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="pnl" 
                name="Monthly PnL (%)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Best Month</div>
            <div className="font-semibold text-green-600">
              {bestMonth?.pnlFormatted} ({bestMonth?.month})
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Worst Month</div>
            <div className="font-semibold text-red-600">
              {worstMonth?.pnlFormatted} ({worstMonth?.month})
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}