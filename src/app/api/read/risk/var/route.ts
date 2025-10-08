import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type VarPayload = { varUsd: number; varPct: number; ts: string }

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const window = (url.searchParams.get('window') || '1d').toLowerCase()
  if (window !== '1d' && window !== '7d') {
    return NextResponse.json({ error: 'invalid window' }, { status: 400 })
  }
  const key = window === '1d' ? 'var.1d.usd' : 'var.7d.usd'
  try {
    const [varRow] = await prisma.$queryRaw<Array<{ value: number; ts: Date }>>`
      SELECT (value)::float8 AS value, ts FROM metrics
      WHERE lower(key) = ${key}
      ORDER BY ts DESC
      LIMIT 1
    `
    if (!varRow) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    const [navRow] = await prisma.$queryRaw<Array<{ value: number; ts: Date }>>`
      SELECT (value)::float8 AS value, ts FROM metrics
      WHERE lower(key) = 'nav.usd'
      ORDER BY ts DESC
      LIMIT 1
    `
    const nav = navRow?.value ?? 0
    const varUsd = Number(varRow.value || 0)
    const varPct = nav > 0 ? (varUsd / nav) * 100 : 0
    const payload: VarPayload = { varUsd, varPct, ts: varRow.ts.toISOString() }
    return NextResponse.json(payload)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
