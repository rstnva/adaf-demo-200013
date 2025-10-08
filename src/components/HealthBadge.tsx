"use client"

import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"

async function fetchHealth() {
  const c = new AbortController()
  const id = setTimeout(() => c.abort(), 3000)
  try {
    const res = await fetch("/api/health", { signal: c.signal })
    const json = await res.json()
    return json as { ok: boolean; ts: string }
  } catch {
    return { ok: false, ts: new Date().toISOString() }
  } finally {
    clearTimeout(id)
  }
}

export function HealthBadge() {
  const { data } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, staleTime: 10_000 })
  const ok = data?.ok
  const color = ok ? "bg-green-500" : "bg-yellow-500"
  return <Badge className={`${color} text-white`}>{ok ? "Healthy" : "Degraded"}</Badge>
}
