import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const limits = await prisma.$queryRaw<Array<{ key: string; value: number; notes: string | null; createdAt: string; updatedAt: string }>>`
      SELECT key, value, notes, "createdAt", "updatedAt" FROM limits ORDER BY key ASC
    `
    const metrics = await prisma.$queryRaw<Array<{ key: string; value: number; ts: string | null }>>`
      SELECT key, value::float8 as value, ts FROM metrics WHERE key IN ('ltv.current','hf.current','slippage.current','realyield.current') ORDER BY ts DESC
    `
    return NextResponse.json({ limits, metrics })
  } catch {
    return NextResponse.json({ limits: [], metrics: [] })
  }
}
