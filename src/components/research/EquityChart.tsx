'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

import { EquityPoint } from '@/types/research';

interface EquityChartProps {
  data: EquityPoint[];
}

/**
 * Equity curve chart showing strategy vs benchmark performance
 */
export function EquityChart({ data }: EquityChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No equity data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = data.map((point) => ({
    date: new Date(point.ts).toLocaleDateString(),
    timestamp: point.ts,
    strategy: point.strat,
    benchmark: point.bench,
    strategyPct: ((point.strat - 1) * 100).toFixed(2),
    benchmarkPct: ((point.bench - 1) * 100).toFixed(2),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-md p-3">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm">
                Strategy: {data.strategyPct}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-sm">
                Benchmark: {data.benchmarkPct}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Excess: {(parseFloat(data.strategyPct) - parseFloat(data.benchmarkPct)).toFixed(2)}%
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate performance stats
  const finalStrategy = chartData[chartData.length - 1]?.strategyPct || '0';
  const finalBenchmark = chartData[chartData.length - 1]?.benchmarkPct || '0';
  const excessReturn = (parseFloat(finalStrategy) - parseFloat(finalBenchmark)).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Equity Curve
          </span>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Strategy: {finalStrategy}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span>Benchmark: {finalBenchmark}%</span>
            </div>
            <div className={`font-medium ${
              parseFloat(excessReturn) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Excess: {excessReturn}%
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                domain={['dataMin - 0.01', 'dataMax + 0.01']}
                tickFormatter={(value) => `${((value - 1) * 100).toFixed(1)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="strategy"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Strategy"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="#6b7280"
                strokeWidth={2}
                name="Benchmark"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}