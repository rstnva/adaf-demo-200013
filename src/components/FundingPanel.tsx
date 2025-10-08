"use client"
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FundingPoint = {
  date: string
  exchange: string
  window: '8h' | '1d'
  fundingRate: number
}

type FundingPanelProps = {
  onError?: (error: string) => void
}

// Simple sparkline component for 14-day funding trend
function FundingSparkline({ data }: { data: number[] }) {
  if (data.length === 0) return <span className="text-xs text-muted-foreground">No data</span>
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  return (
    <div className="flex items-end gap-px h-6 w-20">
      {data.slice(-14).map((value, i) => {
        const height = ((value - min) / range) * 20 + 2
        const color = value < 0 ? 'bg-red-400' : 'bg-green-400'
        return (
          <div
            key={i}
            className={`${color} w-1 opacity-70`}
            style={{ height: `${height}px` }}
            title={`${value.toFixed(3)}%`}
          />
        )
      })}
    </div>
  )
}

export default function FundingPanel({ onError }: FundingPanelProps) {
  const [asset, setAsset] = useState<'BTC' | 'ETH'>('BTC')
  const [data, setData] = useState<FundingPoint[]>([])
  const [loading, setLoading] = useState(false)
  
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/read/derivs/funding?asset=${asset}&days=14`, {
        cache: 'no-store'
      })
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      
      const json: FundingPoint[] = await res.json()
      setData(json)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load funding data'
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }, [asset, onError])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Group by exchange and calculate metrics
  const exchangeData = data.reduce((acc, point) => {
    if (!acc[point.exchange]) {
      acc[point.exchange] = {
        latest: null as FundingPoint | null,
        rates: [] as number[]
      }
    }
    
    acc[point.exchange].rates.push(point.fundingRate)
    
    // Keep latest (most recent date)
    if (!acc[point.exchange].latest || point.date > acc[point.exchange].latest!.date) {
      acc[point.exchange].latest = point
    }
    
    return acc
  }, {} as Record<string, { latest: FundingPoint | null; rates: number[] }>)
  
  // Calculate if funding has been negative for extended period (simplified: average of last 6-9 points)
  const isNegativeExtended = (rates: number[]) => {
    const recent = rates.slice(-8) // roughly 48-72h if 8h windows
    if (recent.length < 6) return false
    const recentAvg = recent.reduce((sum, r) => sum + r, 0) / recent.length
    return recentAvg < 0
  }
  
  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-medium mb-3">Funding Radar</h3>
        <div className="text-center text-muted-foreground py-8">Loading funding data...</div>
      </div>
    )
  }
  
  const exchanges = Object.keys(exchangeData).sort()
  
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Funding Radar</h3>
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
      
      {exchanges.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No funding data available for {asset}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Exchange</th>
                <th className="text-left p-2">Latest Rate</th>
                <th className="text-left p-2">Window</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">14d Trend</th>
                <th className="text-left p-2">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {exchanges.map(exchange => {
                const exData = exchangeData[exchange]
                const latest = exData.latest
                const isNegExtended = isNegativeExtended(exData.rates)
                
                if (!latest) return null
                
                return (
                  <tr key={exchange} className="border-b">
                    <td className="p-2 font-medium capitalize">{exchange}</td>
                    <td className="p-2">
                      <span className={latest.fundingRate < 0 ? 'text-red-600' : 'text-green-600'}>
                        {latest.fundingRate > 0 ? '+' : ''}
                        {latest.fundingRate.toFixed(4)}%
                      </span>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {latest.window}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {isNegExtended ? (
                        <Badge variant="destructive" className="text-xs">
                          Neg 48h+
                        </Badge>
                      ) : latest.fundingRate < 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          Negative
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Positive
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <FundingSparkline data={exData.rates} />
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {latest.date}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-3 text-xs text-muted-foreground">
        Funding rates show cost of holding perpetual positions. Negative rates indicate shorts pay longs.
      </div>
    </div>
  )
}