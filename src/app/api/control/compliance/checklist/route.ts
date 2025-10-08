import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'
import { normalizeKey, isSlugLike, safeUrl, sanitizeTitle } from '@/lib/compliance'
import { requireRole } from '@/lib/auth/helpers'

const prisma = new PrismaClient()

type Payload = { item: { key: string; title?: string; status?: 'pass'|'warn'|'fail'; evidenceUrl?: string }; actor: string }

export async function POST(req: NextRequest) {
  // Require admin permissions for compliance checklist management
  const authCheck = await requireRole(req, 'admin');
  
  if (!authCheck.authorized) {
    incApiRequest('control_compliance_checklist', 'POST', 403);
    return NextResponse.json(
      { error: 'forbidden', need: 'admin', message: authCheck.error },
      { status: 403 }
    );
  }
  try {
    const body = (await req.json()) as Payload
    const actor = (body.actor || 'ui').slice(0, 120)
    const keyRaw = (body.item?.key || '').trim()
    if (keyRaw.length < 3) {
      const res = NextResponse.json({ error: 'key too short' }, { status: 400 })
      incApiRequest('/api/control/compliance/checklist','POST', res.status)
      return res
    }
    const key = normalizeKey(keyRaw)
    if (!isSlugLike(key)) {
      const res = NextResponse.json({ error: 'invalid key' }, { status: 400 })
      incApiRequest('/api/control/compliance/checklist','POST', res.status)
      return res
    }
  const status: 'pass'|'warn'|'fail'|undefined = body.item.status
    if (status && !['pass','warn','fail'].includes(status)) {
      const res = NextResponse.json({ error: 'invalid status' }, { status: 400 })
      incApiRequest('/api/control/compliance/checklist','POST', res.status)
      return res
    }
    const title = sanitizeTitle(body.item.title)
    const evidenceUrl = safeUrl(body.item.evidenceUrl)
    if (body.item.evidenceUrl && !evidenceUrl) {
      const res = NextResponse.json({ error: 'invalid evidenceUrl' }, { status: 400 })
      incApiRequest('/api/control/compliance/checklist','POST', res.status)
      return res
    }

    // Load previous state for audit
    const prev = await prisma.$queryRaw<Array<{ id:number; key:string; title:string; status:string; evidence_url:string|null; updated_at:Date; updated_by:string|null }>>(Prisma.sql`
      SELECT id, key, title, status, evidence_url, updated_at, updated_by
      FROM compliance_items
      WHERE key = ${key}
      LIMIT 1
    `)
    const before = prev[0] ? {
      id: prev[0].id, key: prev[0].key, title: prev[0].title, status: prev[0].status, evidenceUrl: prev[0].evidence_url, updatedAt: prev[0].updated_at.toISOString(), updatedBy: prev[0].updated_by
    } : null

    // Upsert item
    const now = new Date()
  await prisma.$executeRaw(Prisma.sql`
      INSERT INTO compliance_items(key, title, status, evidence_url, updated_at, updated_by)
      VALUES (${key}, ${title ?? (before?.title ?? key)}, ${status ?? (before?.status ?? 'warn')}, ${evidenceUrl ?? before?.evidenceUrl ?? null}, ${now}, ${actor})
      ON CONFLICT (key) DO UPDATE SET
        title = COALESCE(${title}, compliance_items.title),
        status = COALESCE(${status}, compliance_items.status),
        evidence_url = COALESCE(${evidenceUrl}, compliance_items.evidence_url),
        updated_at = ${now},
        updated_by = ${actor}
    `)
    // Fetch after state
    const rows = await prisma.$queryRaw<Array<{ id:number; key:string; title:string; status:string; evidence_url:string|null; updated_at:Date; updated_by:string|null }>>(Prisma.sql`
      SELECT id, key, title, status, evidence_url, updated_at, updated_by
      FROM compliance_items
      WHERE key = ${key}
      LIMIT 1
    `)
    const after = rows[0] && {
      id: rows[0].id, key: rows[0].key, title: rows[0].title, status: rows[0].status, evidenceUrl: rows[0].evidence_url, updatedAt: rows[0].updated_at.toISOString(), updatedBy: rows[0].updated_by
    }

    // Audit entry
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO change_logs(actor, entity, entityId, field, old, new, at)
      VALUES (${actor}, 'Compliance', ${key}, 'UPSERT_COMPLIANCE_ITEM', ${JSON.stringify(before)}, ${JSON.stringify(after)}, ${now})
    `)

    // Debug log
    console.debug({ actor, key, status: status ?? after?.status, evidenceUrl })

    const res = NextResponse.json({ ok: true, item: after }, { status: 201 })
    incApiRequest('/api/control/compliance/checklist','POST', res.status)
    return res
  } catch (e: unknown) {
    const res = NextResponse.json({ error: e instanceof Error ? e.message : 'internal error' }, { status: 500 })
    incApiRequest('/api/control/compliance/checklist','POST', res.status)
    return res
  }
}
