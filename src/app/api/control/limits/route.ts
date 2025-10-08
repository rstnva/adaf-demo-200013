import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

type LimitRow = { key: string; value: number; notes: string | null; createdAt: string | Date; updatedAt: string | Date }

const prisma = new PrismaClient()

export async function GET() {
  const limits = await prisma.$queryRaw<LimitRow[]>`
    SELECT key, value, notes, "createdAt", "updatedAt" FROM "limits" ORDER BY key ASC
  `
  return NextResponse.json(limits)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { key, value, notes, actor = 'ui' } = body as { key: string; value: number; notes?: string; actor?: string }
    if (!key || typeof value !== 'number')
      return NextResponse.json({ error: 'key and value required' }, { status: 400 })

    const oldRows = await prisma.$queryRaw<LimitRow[]>`
      SELECT key, value, notes, "createdAt", "updatedAt" FROM "limits" WHERE key = ${key} LIMIT 1
    `
    const old = oldRows[0] ?? null

    await prisma.$executeRaw`
      INSERT INTO "limits"(key, value, notes)
      VALUES (${key}, ${value}, ${notes})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, notes = EXCLUDED.notes
    `

    await prisma.$executeRaw`
      INSERT INTO "change_logs"(actor, entity, "entityId", field, old, new, at)
      VALUES (${actor}, 'Limit', ${key}, 'value', ${JSON.stringify(old ?? {})}::jsonb, ${JSON.stringify({ key, value, notes })}::jsonb, NOW())
    `

    const savedRows = await prisma.$queryRaw<LimitRow[]>`
      SELECT key, value, notes, "createdAt", "updatedAt" FROM "limits" WHERE key = ${key}
    `
    return NextResponse.json({ ok: true, limit: savedRows[0] })
  } catch (e) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
}
