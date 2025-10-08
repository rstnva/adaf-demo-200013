import { NextResponse } from 'next/server'
import { incApiRequest } from '@/lib/metrics'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{ d: string; c: number }>>`
      SELECT to_char((a."createdAt" AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS d,
             COUNT(*)::int AS c
      FROM alerts a
      WHERE a."createdAt" >= (current_date - 7)
      GROUP BY (a."createdAt" AT TIME ZONE 'UTC')::date
      ORDER BY (a."createdAt" AT TIME ZONE 'UTC')::date ASC
    `
    const res = NextResponse.json(rows)
    incApiRequest('/api/read/kpi/alerts7d','GET', res.status)
    return res
  } catch {
    const res = NextResponse.json([])
    incApiRequest('/api/read/kpi/alerts7d','GET', res.status)
    return res
  }
}
