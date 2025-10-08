type Pt = { date: string; dailyNetInflow: number; cumNetInflow: number; totalNetInflow: number };

const memo: Record<string, { until: number; src: 'SSV'|'DB'; data: Pt[] | null }> = {};

async function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let to: ReturnType<typeof setTimeout> | undefined
  return await Promise.race([
    promise,
    new Promise<T>((_, rej) => { to = setTimeout(() => rej(new Error('timeout')), ms) })
  ]).finally(() => { if (to) clearTimeout(to) })
}

export async function getEtfInflowsAuto(asset: 'BTC'|'ETH', days: number, ssvFn: () => Promise<Pt[] | null>): Promise<{ source: 'SSV'|'DB'; data: Pt[] | null; latencyMs: number }> {
  const key = `${asset}:${days}`
  const now = Date.now()
  const cached = memo[key]
  if (cached && cached.until > now) {
    return { source: cached.src, data: cached.data, latencyMs: 0 }
  }
  const start = performance.now()
  try {
    const data = await fetchWithTimeout(ssvFn(), 1200)
    const latencyMs = Math.round(performance.now() - start)
    console.debug({ source: 'SSV', latencyMs })
    memo[key] = { until: now + 60_000, src: 'SSV', data }
    return { source: 'SSV', data, latencyMs }
  } catch (e) {
    // Fallback to DB
    const qs = new URLSearchParams({ asset, days: String(Math.min(days, 31)) })
    const r = await fetch(`/api/read/etf/flow?${qs.toString()}`, { cache: 'no-store' })
    const json = r.ok ? await r.json() as Pt[] : null
    const latencyMs = Math.round(performance.now() - start)
    console.debug({ source: 'DB', latencyMs })
    memo[key] = { until: now + 60_000, src: 'DB', data: json }
    return { source: 'DB', data: json, latencyMs }
  }
}
