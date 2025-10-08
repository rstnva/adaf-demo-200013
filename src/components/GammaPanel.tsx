"use client"
import { useCallback, useEffect, useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type GammaPoint = {
  strike: number
  gamma: number
}

type GammaResponse = {
  tenor7: GammaPoint[]
  tenor14: GammaPoint[]
  tenor30: GammaPoint[]
}

type GammaPanelProps = {
  onError?: (error: string) => void
}

export default function GammaPanel({ onError }: GammaPanelProps) {
  const [asset, setAsset] = useState<'BTC' | 'ETH'>('BTC')
  const [data, setData] = useState<GammaResponse>({ tenor7: [], tenor14: [], tenor30: [] })
  const [loading, setLoading] = useState(false)
  
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/read/derivs/gamma?asset=${asset}&tenors=7,14,30`, {
        cache: 'no-store'
      })
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const json: GammaResponse = await res.json()
      setData(json)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load gamma data'
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [asset, onError])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Prepare chart data: merge all tenors by strike
  const chartData = useMemo(() => {
    const strikeMap = new Map<number, { strike: number; gamma7?: number; gamma14?: number; gamma30?: number }>()
    
    // Collect all strikes
    const allPoints = data.tenor7.concat(data.tenor14, data.tenor30)
    allPoints.forEach(point => {
      if (!strikeMap.has(point.strike)) {
        strikeMap.set(point.strike, { strike: point.strike })
      }
    })
    
    // Fill gamma values by tenor
    data.tenor7.forEach(point => {
      const entry = strikeMap.get(point.strike)
      if (entry) entry.gamma7 = point.gamma
    })
    
    data.tenor14.forEach(point => {
      const entry = strikeMap.get(point.strike)
      if (entry) entry.gamma14 = point.gamma
    })
    
    data.tenor30.forEach(point => {
      const entry = strikeMap.get(point.strike)
      if (entry) entry.gamma30 = point.gamma
    })
    
    return Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike)
  }, [data])
  
  const hasData = chartData.length > 0
  
  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-medium mb-3">Gamma Surface</h3>
        <div className="text-center text-muted-foreground py-8">Loading gamma data...</div>
      </div>
    )
  }
  
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Gamma Surface</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">Asset:</span>
          <Select value={asset} onValueChange={(v) => setAsset(v as 'BTC' | 'ETH')}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">BTC</SelectItem>
              <SelectItem value="ETH">ETH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {!hasData ? (
        <div className="text-center text-muted-foreground py-8">
          No gamma surface data available for {asset}
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="strike" 
                type="number"
                scale="linear"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis 
                tickFormatter={(value) => value.toFixed(4)}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value?.toFixed(6) || 'N/A', 
                  name.replace('gamma', 'Tenor ')
                ]}
                labelFormatter={(strike) => `Strike: ${strike}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="gamma7" 
                stroke="#8884d8" 
                name="7d"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="gamma14" 
                stroke="#82ca9d" 
                name="14d"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="gamma30" 
                stroke="#ffc658" 
                name="30d"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="mt-3 text-xs text-muted-foreground">
        Gamma measures the rate of change in delta for option positions. Higher gamma indicates greater sensitivity to price moves.
      </div>
    </div>
  )
}