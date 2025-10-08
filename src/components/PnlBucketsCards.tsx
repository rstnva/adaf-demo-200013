"use client"
import { useQuery } from '@tanstack/react-query'
import { fetchPnlBuckets, PnlSummary } from '@/lib/data/pnlBuckets'

const colors: Record<string, string> = {
  NM: 'bg-blue-50 text-blue-800',
  OC: 'bg-green-50 text-green-800',
  OF: 'bg-amber-50 text-amber-800',
  DV: 'bg-red-50 text-red-800',
  MX: 'bg-violet-50 text-violet-800',
  OP: 'bg-sky-50 text-sky-800',
}

export default function PnlBucketsCards({ days = 14 }: { days?: number }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['pnl-buckets', days], queryFn: () => fetchPnlBuckets(days) })
  if (isLoading) return <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
  if (error) return <div className="text-sm text-red-600">{String((error as Error).message)}</div>
  const summary = (data?.summary ?? []) as PnlSummary[]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {summary.map((s) => (
        <div key={s.bucket} className={`rounded p-3 ${colors[s.bucket] ?? 'bg-muted'}`}>
          <div className="text-xs uppercase opacity-80">{s.bucket}</div>
          <div className="text-lg font-semibold">${s.pnlUsd.toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}
