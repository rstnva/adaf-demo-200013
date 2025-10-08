import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ALLOWED = new Set(['proposed','approved','rejected'])

export async function POST(_req: NextRequest, { params }: { params: Promise<{ opp_id: string; status: string }> }) {
  const { opp_id, status } = await params
  if (!ALLOWED.has(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  await prisma.$executeRawUnsafe(`UPDATE "opportunities" SET status = $1, "updatedAt" = NOW() WHERE id = $2`, status, opp_id)
  return NextResponse.json({ ok: true })
}
