"use client"
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { fetchPnlBuckets, PnlDaily } from '@/lib/data/pnlBuckets'

export default function PnlBucketsChart() {
  const [days, setDays] = useState(14)
  const { data, isLoading, error } = useQuery({ queryKey: ['pnl-buckets', days], queryFn: () => fetchPnlBuckets(days) })
  if (isLoading) return <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />
  if (error) return <div className="text-sm text-red-600">{String((error as Error).message)}</div>
  const daily = (data?.daily ?? []) as PnlDaily[]
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground">Days:</span>
        {[7,14,30].map(d => (
          <button key={d} className={`px-2 py-1 text-xs rounded border ${days===d?'bg-primary text-primary-foreground':'bg-background'}`} onClick={()=>setDays(d)}>{d}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={daily}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(v)=> new Date(v).toLocaleDateString()} />
          <YAxis tickFormatter={(v)=>`$${(v as number).toLocaleString()}`} />
          <Tooltip formatter={(v:number)=>`$${v.toLocaleString()}`} labelFormatter={(l)=>new Date(l as string).toLocaleDateString()} />
          <Legend />
          <Bar dataKey="NM" stackId="pnl" fill="#1d4ed8" />
          <Bar dataKey="OC" stackId="pnl" fill="#16a34a" />
          <Bar dataKey="OF" stackId="pnl" fill="#f59e0b" />
          <Bar dataKey="DV" stackId="pnl" fill="#ef4444" />
          <Bar dataKey="MX" stackId="pnl" fill="#8b5cf6" />
          <Bar dataKey="OP" stackId="pnl" fill="#0ea5e9" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
