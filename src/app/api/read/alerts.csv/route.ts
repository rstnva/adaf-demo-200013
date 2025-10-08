import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const open = url.searchParams.get('open')
  // Optional type filter was previously applied post-join in JSON route; for CSV we export by base filters.
  const sev = url.searchParams.get('severity')
  const q = url.searchParams.get('q')
  const limitReq = Number(url.searchParams.get('limit') || 500)
  const limit = Math.max(1, Math.min(2000, Number.isFinite(limitReq) ? limitReq : 500))

  const where: Record<string, unknown> = {}
  if (open === '1') where.resolved = false
  if (open === '0') where.resolved = true
  if (sev) where.severity = sev
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }]

  const rows = await prisma.alert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { signal: { select: { type: true, source: true, title: true, timestamp: true } } }
  })

  const header = ['id','createdAt','resolved','severity','title','description','type','source','signalTitle','signalTs']
  const lines = [header.join(',')]
  for (const r of rows) {
    const cells = [
      r.id,
      r.createdAt.toISOString(),
      r.resolved ? '1' : '0',
      r.severity ?? '',
      String(r.title ?? '').replace(/[\r\n,]/g, ' '),
      String(r.description ?? '').replace(/[\r\n,]/g, ' '),
      r.signal?.type ?? '',
      r.signal?.source ?? '',
      String(r.signal?.title ?? '').replace(/[\r\n,]/g, ' '),
      r.signal?.timestamp ? new Date(r.signal.timestamp).toISOString() : ''
    ]
    lines.push(cells.join(','))
  }

  const body = lines.join('\n')
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="alerts_export.csv"'
    }
  })
}
