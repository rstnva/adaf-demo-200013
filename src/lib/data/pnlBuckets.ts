export type PnlBucket = 'NM'|'OC'|'OF'|'DV'|'MX'|'OP'
export type PnlDaily = { date: string } & Record<PnlBucket, number>
export type PnlSummary = { bucket: PnlBucket; pnlUsd: number }

export async function fetchPnlBuckets(days = 14): Promise<{ daily: PnlDaily[]; summary: PnlSummary[] }> {
  const res = await fetch(`/api/read/kpi/pnl-buckets?days=${days}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load pnl-buckets: ${res.status}`)
  return res.json()
}
