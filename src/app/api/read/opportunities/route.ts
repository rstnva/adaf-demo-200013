import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

type OpportunityRow = {
  id: string
  signalId: string
  type: string
  confidence: number
  title: string
  description: string
  metadata: unknown
  expired: boolean
  expiredAt: string | Date | null
  status?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status')
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 200)
    const rows = statusParam
      ? await prisma.$queryRaw<OpportunityRow[]>`SELECT * FROM opportunities WHERE status = ${statusParam} ORDER BY "createdAt" DESC LIMIT ${limit}`
      : await prisma.$queryRaw<OpportunityRow[]>`SELECT * FROM opportunities ORDER BY "createdAt" DESC LIMIT ${limit}`
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}