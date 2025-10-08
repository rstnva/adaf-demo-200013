import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Row = { date: string; daily: number }

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const daysReq = Number(url.searchParams.get('days') || 7)
    const days = Math.max(1, Math.min(31, Number.isFinite(daysReq) ? daysReq : 7))
    const provider = url.searchParams.get('provider') // 'farside' | 'sosovalue' | 'any'

    const assets = ['BTC', 'ETH'] as const
    const out: Record<(typeof assets)[number], { date: string; dailyNetInflow: number; cumNetInflow: number }[]> = {
      BTC: [],
      ETH: []
    }

    for (const asset of assets) {
      let rows: Row[]
      if (provider && provider !== 'any') {
        rows = await prisma.$queryRaw<Row[]>`
          SELECT to_char((s."timestamp" AT TIME ZONE 'UTC')::date,'YYYY-MM-DD') as date,
                 SUM(COALESCE((s.metadata->>'netInUsd')::numeric,0))::float8 as daily
          FROM signals s
          WHERE s.type='offchain'
            AND upper(s.metadata->>'asset')=${asset}
            AND s.source = ${provider}
            AND (s."timestamp" AT TIME ZONE 'UTC')::date >= (current_date - ${days - 1}::int)
          GROUP BY (s."timestamp" AT TIME ZONE 'UTC')::date
          ORDER BY (s."timestamp" AT TIME ZONE 'UTC')::date ASC
        `
      } else {
        rows = await prisma.$queryRaw<Row[]>`
          SELECT to_char((s."timestamp" AT TIME ZONE 'UTC')::date,'YYYY-MM-DD') as date,
                 SUM(COALESCE((s.metadata->>'netInUsd')::numeric,0))::float8 as daily
          FROM signals s
          WHERE s.type='offchain'
            AND upper(s.metadata->>'asset')=${asset}
            AND (s."timestamp" AT TIME ZONE 'UTC')::date >= (current_date - ${days - 1}::int)
          GROUP BY (s."timestamp" AT TIME ZONE 'UTC')::date
          ORDER BY (s."timestamp" AT TIME ZONE 'UTC')::date ASC
        `
      }

      let cum = 0
      out[asset] = rows.map((r) => {
        const d = r.daily || 0
        cum += d
        return { date: r.date, dailyNetInflow: d, cumNetInflow: cum }
      })
    }

    return NextResponse.json(out)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
