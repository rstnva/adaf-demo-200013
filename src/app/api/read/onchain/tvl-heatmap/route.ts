import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

type Row = { date: string; chain: string; tvlUsd: number }

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const daysReq = Number(url.searchParams.get('days') || 14)
    const days = Math.max(1, Math.min(60, Number.isFinite(daysReq) ? daysReq : 14))

    // signals table: type='onchain', source OC-1, metadata contains chain, protocol, metric, value, ts
    // We want last point per chain per day (by timestamp desc) and aggregate per day×chain using that last value
    const rows = await prisma.$queryRaw<Row[]>`
      WITH pts AS (
        SELECT
          to_char((s."timestamp" AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
          (s.metadata->>'chain')                                       AS chain,
          (s.metadata->>'metric')                                      AS metric,
          COALESCE((s.metadata->>'value')::numeric, 0)                 AS value,
          s."timestamp"                                              AS ts,
          ROW_NUMBER() OVER (
            PARTITION BY (s.metadata->>'chain'), (s."timestamp" AT TIME ZONE 'UTC')::date
            ORDER BY s."timestamp" DESC
          ) AS rn
        FROM signals s
        WHERE s.type = 'onchain'
          AND (s.metadata->>'metric') = 'tvl.usd'
          AND (s."timestamp" AT TIME ZONE 'UTC')::date >= (current_date - ${days - 1}::int)
      )
      SELECT date, chain, SUM(value)::float8 AS "tvlUsd"
      FROM pts
      WHERE rn = 1
      GROUP BY date, chain
      ORDER BY date ASC, chain ASC
    `

    const res = NextResponse.json(rows)
    incApiRequest('/api/read/onchain/tvl-heatmap','GET', res.status)
    return res
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'internal error'
    const res = NextResponse.json({ error: message }, { status: 500 })
    incApiRequest('/api/read/onchain/tvl-heatmap','GET', res.status)
    return res
  }
}
