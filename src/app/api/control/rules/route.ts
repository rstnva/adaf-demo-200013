import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

type RuleRow = { id: string; agentCode: string; name: string; expr: string; enabled: boolean; createdAt: string | Date }

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentCode = searchParams.get('agentCode') || undefined
  const rows = agentCode
    ? await prisma.$queryRaw<RuleRow[]>`SELECT * FROM rules WHERE "agentCode" = ${agentCode} ORDER BY "createdAt" DESC`
    : await prisma.$queryRaw<RuleRow[]>`SELECT * FROM rules ORDER BY "createdAt" DESC`
  const parsed = rows.map(r => ({ ...r, expr: safeParse(r.expr) }))
  return NextResponse.json(parsed)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentCode, name, expr, enabled = true, actor = 'ui' } = body as { agentCode: string; name: string; expr: unknown; enabled?: boolean; actor?: string }
    if (!agentCode || !name || !expr) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    const exprStr = typeof expr === 'string' ? expr : JSON.stringify(expr)
    const rows = await prisma.$queryRaw<RuleRow[]>`
      INSERT INTO rules("agentCode", name, expr, enabled)
      VALUES (${agentCode}, ${name}, ${exprStr}, ${enabled})
      RETURNING *
    `
    const created = rows[0]
    await prisma.$executeRaw`
      INSERT INTO change_logs(actor, entity, "entityId", field, old, new, at)
      VALUES (${actor}, 'Rule', ${created.id}, 'create', '{}'::jsonb, ${JSON.stringify(created)}::jsonb, NOW())
    `
    return NextResponse.json({ ok: true, rule: created })
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
}

function safeParse(s: unknown): unknown {
  try {
    if (typeof s === 'string') return JSON.parse(s)
    return s
  } catch {
    return s
  }
}
