import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type DdRow = { date: string; nav: number; ddPct: number; ddUsd: number; peak: number }

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const daysStr = url.searchParams.get('days') || '90'
  const n = Number(daysStr)
  if (!Number.isFinite(n)) {
    return NextResponse.json({ error: 'invalid days' }, { status: 400 })
  }
  const days = Math.max(1, Math.min(365, n))
  try {
    // Last value per day (UTC) for nav.usd
    const rows = await prisma.$queryRaw<Array<{ d: string; nav: number }>>`
      WITH src AS (
        SELECT (ts AT TIME ZONE 'UTC')::date AS day,
               (value)::numeric AS nav,
               ts,
               ROW_NUMBER() OVER (PARTITION BY (ts AT TIME ZONE 'UTC')::date ORDER BY ts DESC) AS rn
        FROM metrics
        WHERE lower(key) = 'nav.usd'
          AND (ts AT TIME ZONE 'UTC')::date >= (current_date - ${days - 1}::int)
      )
      SELECT to_char(day,'YYYY-MM-DD') AS d, nav::float8 AS nav
      FROM src
      WHERE rn = 1
      ORDER BY d ASC
    `
    let peak = 0
    const out: DdRow[] = rows.map((r) => {
      const nav = Number(r.nav || 0)
      peak = Math.max(peak, nav)
      const ddUsd = nav - peak
      const ddPct = peak > 0 ? (ddUsd / peak) * 100 : 0
      return { date: r.d, nav, ddPct, ddUsd, peak }
    })
    return NextResponse.json(out)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
