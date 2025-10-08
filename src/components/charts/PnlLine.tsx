"use client"

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from "@tanstack/react-query"
import { getPNLSeries } from "@/lib/data/pnl"

export function PnlLine() {
  const { data } = useQuery({ queryKey: ["pnl"], queryFn: getPNLSeries })
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);
  async function handleExportPNG() {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      // @ts-expect-error: html-to-image types not installed; resolved at runtime
      const mod = await import('html-to-image')
  await mod.toPng(chartRef.current)
        .then((dataUrl: string) => {
          const link = document.createElement('a');
          link.download = `pnl_chart_${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        })
    } finally {
      setExporting(false)
    }
  }
  if (!data) {
    return <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />
  }
  return (
    <div ref={chartRef} className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis 
            tickFormatter={(value) => `$${(value as number).toLocaleString()}`}
          />
          <Tooltip 
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'PnL']}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Line 
            type="monotone" 
            dataKey="pnl" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={{ fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <button
        data-testid="export-png-btn"
        className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700 text-xs"
        onClick={handleExportPNG}
        disabled={exporting}
      >
        {exporting ? 'Exporting...' : 'Export PNG'}
      </button>
    </div>
  )
}