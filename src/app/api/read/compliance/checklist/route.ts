import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

type Item = { id: number; key: string; title: string; status: 'pass'|'warn'|'fail'; evidenceUrl?: string | null; updatedAt: string; updatedBy?: string | null }

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const status = url.searchParams.get('status') as Item['status'] | null
  const q = url.searchParams.get('q')
  const limitReq = Number(url.searchParams.get('limit') || 200)
  const limit = Math.max(1, Math.min(500, Number.isFinite(limitReq) ? limitReq : 200))
  const statusParam = status ?? null
  const qParam = q ? `%${q}%` : null
  try {
    const rows = await prisma.$queryRaw<Array<{ id:number; key:string; title:string; status:string; evidence_url:string|null; updated_at:Date; updated_by:string|null }>>(Prisma.sql`
      SELECT id, key, title, status, evidence_url, updated_at, updated_by
      FROM compliance_items
      WHERE (${statusParam}::text IS NULL OR status = ${statusParam})
        AND (${qParam}::text IS NULL OR key ILIKE ${qParam} OR title ILIKE ${qParam})
      ORDER BY updated_at DESC
      LIMIT ${Prisma.raw(String(limit))}
    `)
    const items: Item[] = rows.map(r => ({
      id: r.id,
      key: r.key,
      title: r.title,
      status: (r.status as Item['status']),
      evidenceUrl: r.evidence_url ?? null,
      updatedAt: r.updated_at.toISOString(),
      updatedBy: r.updated_by ?? null,
    }))
    const res = NextResponse.json({ items })
    incApiRequest('/api/read/compliance/checklist','GET', res.status)
    return res
  } catch (e: unknown) {
    const res = NextResponse.json({ error: e instanceof Error ? e.message : 'internal error' }, { status: 500 })
    incApiRequest('/api/read/compliance/checklist','GET', res.status)
    return res
  }
}
