import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'
import { requireRole } from '@/lib/auth/helpers'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  // Require admin permissions for control panel operations
  const authCheck = await requireRole(req, 'admin');
  
  if (!authCheck.authorized) {
    incApiRequest('control_opx_score', 'POST', 403);
    return NextResponse.json(
      { error: 'forbidden', need: 'admin', message: authCheck.error },
      { status: 403 }
    );
  }
  const started = Date.now()
  try {
    const body = await req.json().catch(()=>({})) as { id?: string; actor?: string; limit?: number }
    const actor = (body?.actor || 'system').slice(0, 120)
    const id = body?.id ? String(body.id) : null
    const limit = Math.min(Math.max(Number(body?.limit ?? 100), 1), 1000)

    // fetch runtime metrics needed for scoring similar to list endpoint
    const m = await prisma.$queryRaw<Array<{ key:string; value:number }>>(Prisma.sql`
      SELECT key, (value)::float8 AS value
      FROM metrics
      WHERE key IN ('ltv.current','hf.current','slippage.current','realyield.current','nav.usd')
      ORDER BY ts DESC
      LIMIT 5
    `)
    const rt = {
      ltv: Number(m.find(x=>x.key==='ltv.current')?.value ?? 0),
      hf: Number(m.find(x=>x.key==='hf.current')?.value ?? 0),
      slippage: Number(m.find(x=>x.key==='slippage.current')?.value ?? 0),
      realyield: Number(m.find(x=>x.key==='realyield.current')?.value ?? 0),
      nav: Number(m.find(x=>x.key==='nav.usd')?.value ?? 0),
    }

    const where = id
      ? Prisma.sql`WHERE id=${id}`
      : Prisma.sql`WHERE status='proposed'`

    type OpxMeta = { asset?: string; agentBucket?: string; sizing?: { notionalPctNAV?: number; maxDDbps?: number }; var?: number }
    const rows = await prisma.$queryRaw<Array<{ id:string; metadata: OpxMeta | null; signalId: string | null }>>(Prisma.sql`
      SELECT id, metadata, "signalId" FROM opportunities
      ${where}
      ORDER BY "createdAt" DESC
      LIMIT ${Prisma.raw(String(limit))}
    `)

    let updated = 0
    for (const r of rows) {
  const meta: OpxMeta = (r.metadata ?? {}) as OpxMeta
      // consensus calc: recent 7d same asset/bucket
      let consensus = 0
      try {
        const asset = meta?.asset || ''
        const bucket = meta?.agentBucket || ''
        const consRows = await prisma.$queryRaw<Array<{ src:string; dir:number }>>(Prisma.sql`
          SELECT source AS src,
                 CASE WHEN (metadata->>'direction') IN ('pro','bull','positive') THEN 1
                      WHEN (metadata->>'direction') IN ('con','bear','negative') THEN -1
                      ELSE 0 END AS dir
          FROM signals
          WHERE (metadata->>'asset') = ${asset}
            AND (metadata->>'bucket') = ${bucket}
            AND timestamp >= (now() - interval '7 days')
        `)
        const pos = consRows.filter(x=>x.dir>0).length
        const neg = consRows.filter(x=>x.dir<0).length
        consensus = (pos + neg) > 0 ? pos / (pos + neg) : 0
        const distinctSources = new Set(consRows.filter(x=>x.dir>0).map(x=>x.src)).size
        if (distinctSources >= 3) consensus = Math.min(1, consensus + 0.1)
      } catch {}

      // base severity from linked signal
      let base = 50
      try {
        if (r.signalId) {
          const [sevRow] = await prisma.$queryRaw<Array<{ sev:string }>>(Prisma.sql`
            SELECT lower(severity) AS sev FROM signals WHERE id=${r.signalId} LIMIT 1
          `)
          base = sevRow?.sev === 'high' ? 70 : sevRow?.sev === 'medium' ? 50 : sevRow?.sev === 'low' ? 30 : 50
        }
      } catch {}

      // blocking penalties
      const sizing = meta?.sizing || {}
      const blocking = [
        (sizing?.notionalPctNAV ?? 0) > 35 ? 'LTV' : null,
        rt.hf < 1.6 ? 'HF' : null,
        rt.slippage > 0.5 ? 'Slippage' : null,
        rt.realyield < 0.6 ? 'RealYield' : null,
      ].filter(Boolean) as string[]
      const guardrailPenalty = 20 * blocking.length

      const varValue = Number(meta?.var ?? 0)
      const varPct = rt.nav > 0 ? varValue / rt.nav : 0
      const varPenalty = varPct > 0.05 ? 20 : varPct > 0.03 ? 10 : 0

      const adj = consensus >= 0.66 ? 20 : consensus >= 0.33 ? 10 : 0
      const score = Math.min(Math.max(base + adj - guardrailPenalty - varPenalty, 0), 100)

      // persist score into metadata JSONB under key score
      await prisma.$executeRaw(Prisma.sql`
        UPDATE opportunities
        SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{score}', to_jsonb(${score}::int), true),
            "updatedAt" = NOW()
        WHERE id = ${r.id}
      `)
      // audit log
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO change_logs(actor, entity, entityId, field, old, new, at)
        VALUES (${actor}, 'Opportunity', ${r.id}, 'RECALC_SCORE', ${JSON.stringify({ consensus, blocking })}, ${JSON.stringify({ score })}, NOW())
      `)
      updated += 1
    }

    const ms = Date.now() - started
    const res = NextResponse.json({ ok: true, updated, ms })
    incApiRequest('/api/control/opx/score','POST', res.status)
    return res
  } catch (e: unknown) {
    const res = NextResponse.json({ error: e instanceof Error ? e.message : 'internal error' }, { status: 500 })
    incApiRequest('/api/control/opx/score','POST', res.status)
    return res
  }
}
