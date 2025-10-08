import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const b = await req.json() as { provider: 'farside'|'sosovalue'; asset: 'BTC'|'ETH'; date: string; netInUsd: number }
  const fp = crypto.createHash('sha256').update(`${b.provider}|${b.asset}|${b.date}|${b.netInUsd}`).digest('hex')
  const dup = await prisma.signal.findFirst({ where: { fingerprint: fp }})
  if (dup) return NextResponse.json({ status: 'duplicate', fingerprint: fp })

  const rec = await prisma.signal.create({
    data: {
      type: 'offchain',
      source: b.provider,
      title: `ETF ${b.asset} net flow`,
      description: b.date,
      severity: 'medium',
      metadata: { asset: b.asset, netInUsd: b.netInUsd },
      fingerprint: fp,
      timestamp: new Date(`${b.date}T00:00:00Z`),
      processed: false
    }
  })
  return NextResponse.json({ status: 'ok', id: rec.id, fingerprint: fp })
}
