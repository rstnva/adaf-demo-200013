import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest, incOpxAction, setOpxBacklog } from '@/lib/metrics'
import { requireRole } from '@/lib/auth/helpers'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  // Require analyst or higher permissions for OP-X actions
  const authCheck = await requireRole(req, 'analyst');
  
  if (!authCheck.authorized) {
    incApiRequest('/api/actions/opx/reject', 'POST', 403);
    return NextResponse.json(
      { error: 'forbidden', need: 'analyst', message: authCheck.error },
      { status: 403 }
    );
  }
  try {
    const body = await req.json() as { id: string; actor: string; note?: string }
    const id = String(body.id)
    const actor = (body.actor || 'ui').slice(0, 120)
    const note = (body.note || '').replace(/[\u0000-\u001F\u007F<>]/g, '').slice(0, 500)
    const now = new Date()
    const [row] = await prisma.$queryRaw<Array<{ status:string }>>(Prisma.sql`SELECT status FROM opportunities WHERE id=${id} LIMIT 1`)
    if (!row) {
      const res = NextResponse.json({ error: 'not found' }, { status: 404 })
      incApiRequest('/api/actions/opx/reject','POST', res.status)
      return res
    }
    if ((row.status||'').toLowerCase() === 'rejected') {
      await prisma.$executeRaw(Prisma.sql`INSERT INTO change_logs(actor, entity, entityId, field, old, new, at) VALUES (${actor}, 'Opportunity', ${id}, 'REJECT', ${JSON.stringify({ note })}, ${JSON.stringify({ id, status:'rejected'})}, ${now})`)
      const res = NextResponse.json({ ok: true, id, status: 'rejected' })
      incOpxAction('REJECT','noop'); incApiRequest('/api/actions/opx/reject','POST', res.status)
      return res
    }
    await prisma.$executeRaw(Prisma.sql`UPDATE opportunities SET status='rejected', "updatedAt"=${now} WHERE id=${id}`)
    // refresh backlog gauges
    try {
      const counts = await prisma.$queryRaw<Array<{ status:string; c:number }>>(Prisma.sql`SELECT status, COUNT(*)::int AS c FROM opportunities GROUP BY status`)
      for (const c of counts) {
        const s = (c.status || '').toLowerCase() as 'proposed'|'approved'|'rejected'
        if (s==='proposed'||s==='approved'||s==='rejected') setOpxBacklog(s, Number(c.c||0))
      }
    } catch {}
    await prisma.$executeRaw(Prisma.sql`INSERT INTO change_logs(actor, entity, entityId, field, old, new, at) VALUES (${actor}, 'Opportunity', ${id}, 'REJECT', ${JSON.stringify({ note })}, ${JSON.stringify({ id, status:'rejected'})}, ${now})`)
    const res = NextResponse.json({ ok: true, id, status: 'rejected' })
    incOpxAction('REJECT','ok'); incApiRequest('/api/actions/opx/reject','POST', res.status)
    return res
  } catch (e: unknown) {
    const res = NextResponse.json({ error: e instanceof Error ? e.message : 'internal error' }, { status: 500 })
    incOpxAction('REJECT','error'); incApiRequest('/api/actions/opx/reject','POST', res.status)
    return res
  }
}
