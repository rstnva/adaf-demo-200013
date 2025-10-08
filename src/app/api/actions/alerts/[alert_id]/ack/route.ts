import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(_req: NextRequest, { params }: { params: Promise<{ alert_id: string }> }) {
  const { alert_id } = await params
  await prisma.alert.update({ where: { id: alert_id }, data: { resolved: true, resolvedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
