"use client"
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { EtfInflowChart } from '@/components/ssv/EtfInflowChart'
import type { HistoricalInflow, EtfType } from '@/lib/ssv'
import { getEtfInflowsAuto } from '@/lib/data/etfAutoswitch'
import { fetchHistoricalInflow } from '@/lib/ssv'

type Pt = { date: string; dailyNetInflow: number; cumNetInflow: number; totalNetInflow: number }

export default function EtfFlowsAuto({ asset = 'BTC', days = 7 }: { asset?: 'BTC'|'ETH'; days?: number }) {
  const [source, setSource] = useState<'SSV'|'DB'>('SSV')
  const [data, setData] = useState<Pt[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const type: EtfType = asset === 'BTC' ? 'us-btc-spot' : 'us-eth-spot'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const ssvFn = async () => {
          const t: EtfType = asset === 'BTC' ? 'us-btc-spot' : 'us-eth-spot'
          const res = await fetchHistoricalInflow(t, Math.max(7, Math.min(days ?? 7, 300)))
          return res as unknown as Pt[]
        }
        const r = await getEtfInflowsAuto(asset, days ?? 7, ssvFn)
        if (cancelled) return
        setSource(r.source)
        setData(r.data)
      } catch (e: unknown) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [asset, days])

  const inflows = useMemo(() => (data as unknown as HistoricalInflow[] | null), [data])
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Source:&nbsp;
        <Badge variant="outline">{source}</Badge>
      </div>
      <EtfInflowChart type={type} data={inflows} loading={loading} error={error ? new Error(error) : null} />
    </div>
  )
}
