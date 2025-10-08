import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

type DailyRow = { date: string; NM: number; OC: number; OF: number; DV: number; MX: number; OP: number }
type SummaryRow = { bucket: 'NM'|'OC'|'OF'|'DV'|'MX'|'OP'; pnlUsd: number }

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const daysStr = url.searchParams.get('days') || '30'
  const daysNum = Number(daysStr)
  if (!Number.isFinite(daysNum)) {
    const res = NextResponse.json({ error: 'invalid days' }, { status: 400 })
    incApiRequest('/api/read/kpi/pnl-buckets','GET', res.status)
    return res
  }
  const days = Math.max(1, Math.min(60, daysNum))

  const keys = ['pnl.nm.usd','pnl.oc.usd','pnl.of.usd','pnl.dv.usd','pnl.mx.usd','pnl.op.usd'] as const

  try {
    const keysSql = Prisma.join(keys)
    const daily = await prisma.$queryRaw<DailyRow[]>`
      WITH d AS (
        SELECT generate_series((current_date - ${days - 1}::int)::date, current_date::date, interval '1 day')::date AS day
      ), agg AS (
        SELECT (m.ts AT TIME ZONE 'UTC')::date AS day, lower(m.key) AS key, SUM((m.value)::numeric) AS v
        FROM metrics m
        WHERE lower(m.key) IN (${keysSql})
          AND (m.ts AT TIME ZONE 'UTC')::date >= (current_date - ${days - 1}::int)
        GROUP BY 1,2
      )
      SELECT to_char(d.day,'YYYY-MM-DD') AS date,
        COALESCE(SUM(CASE WHEN a.key='pnl.nm.usd' THEN a.v END),0)::float8 AS "NM",
        COALESCE(SUM(CASE WHEN a.key='pnl.oc.usd' THEN a.v END),0)::float8 AS "OC",
        COALESCE(SUM(CASE WHEN a.key='pnl.of.usd' THEN a.v END),0)::float8 AS "OF",
        COALESCE(SUM(CASE WHEN a.key='pnl.dv.usd' THEN a.v END),0)::float8 AS "DV",
        COALESCE(SUM(CASE WHEN a.key='pnl.mx.usd' THEN a.v END),0)::float8 AS "MX",
        COALESCE(SUM(CASE WHEN a.key='pnl.op.usd' THEN a.v END),0)::float8 AS "OP"
      FROM d LEFT JOIN agg a ON a.day = d.day
      GROUP BY d.day
      ORDER BY d.day ASC
    `

    const summaryRaw = await prisma.$queryRaw<Array<{ key: string; pnl: number }>>`
      SELECT lower(key) AS key, SUM((value)::numeric)::float8 AS pnl
      FROM metrics
      WHERE lower(key) IN (${keysSql})
        AND (ts AT TIME ZONE 'UTC')::date >= (current_date - ${days - 1}::int)
      GROUP BY lower(key)
    `

    const toBucket = (k: string): SummaryRow['bucket'] =>
      ({ 'pnl.nm.usd': 'NM', 'pnl.oc.usd': 'OC', 'pnl.of.usd': 'OF', 'pnl.dv.usd': 'DV', 'pnl.mx.usd': 'MX', 'pnl.op.usd': 'OP' } as const)[k]!

    const summaryMap = new Map<SummaryRow['bucket'], number>([['NM',0],['OC',0],['OF',0],['DV',0],['MX',0],['OP',0]])
    for (const r of summaryRaw) {
      const b = toBucket(r.key)
      summaryMap.set(b, (summaryMap.get(b) || 0) + Number(r.pnl || 0))
    }
    const summary: SummaryRow[] = Array.from(summaryMap.entries()).map(([bucket, pnlUsd]) => ({ bucket, pnlUsd }))

    const res = NextResponse.json({ summary, daily })
    incApiRequest('/api/read/kpi/pnl-buckets','GET', res.status)
    return res
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'internal error'
    const res = NextResponse.json({ error: message }, { status: 500 })
    incApiRequest('/api/read/kpi/pnl-buckets','GET', res.status)
    return res
  }
}
