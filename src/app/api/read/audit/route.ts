import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const entity = url.searchParams.get('entity')
  const limitReq = Number(url.searchParams.get('limit') || 50)
  const limit = Math.max(1, Math.min(500, Number.isFinite(limitReq) ? limitReq : 50))
  try {
    const rows = await prisma.$queryRaw<Array<{ id:string; actor:string; entity:string; entityid:string; field:string; old:unknown; new:unknown; at:Date }>>(Prisma.sql`
      SELECT id, actor, entity, entityId, field, old, new, at
      FROM change_logs
      WHERE (${entity}::text IS NULL OR entity = ${entity})
      ORDER BY at DESC
      LIMIT ${Prisma.raw(String(limit))}
    `)
    const res = NextResponse.json(rows)
    incApiRequest('/api/read/audit','GET', res.status)
    return res
  } catch (e: unknown) {
    const res = NextResponse.json({ error: e instanceof Error ? e.message : 'internal error' }, { status: 500 })
    incApiRequest('/api/read/audit','GET', res.status)
    return res
  }
}
