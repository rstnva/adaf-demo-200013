import { PrismaClient } from '@prisma/client'
import type { RuleExpr, Evaluated } from '../rules'

const prisma = new PrismaClient()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function evalRule(expr: RuleExpr, signal: any): Promise<Evaluated> {
  if (expr.kind === 'keyword') {
    const title = (signal.metadata?.title ?? signal.title ?? '').toString()
    const summary = (signal.metadata?.description ?? signal.description ?? '').toString()
    const text = `${title} ${summary}`.toLowerCase()
    const hit = expr.anyOf.some(k => text.includes(k.toLowerCase()))
    return { pass: hit, reason: hit ? `hit:${expr.anyOf.join(',')}` : 'nohit' }
  }

  if (expr.kind === 'tvl.drop') {
    // Usamos TVLData en vez de señales kind=onchain.tvl.point
    const proto = expr.protocol ?? signal.metadata?.protocol
    if (!proto) return { pass: false, reason: 'no_protocol' }

    const last = await prisma.tVLData.findMany({
      where: { protocol: proto },
      orderBy: { timestamp: 'desc' },
      take: 2
    })
    if (last.length < 2) return { pass: false, reason: 'insufficient_tvl' }
    const v0 = last[1].tvl
    const v1 = last[0].tvl
    const dd = (v1 - v0) / Math.max(v0, 1)
    const pass = dd <= -expr.minDropPct
    return { pass, reason: `dd=${dd.toFixed(4)}`, derived: { dd, v0, v1 } }
  }

  if (expr.kind === 'guardrail') {
    // Casting prisma to unknown/any to avoid transient type mismatch until Prisma Client reloads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lim = await (prisma as unknown as any).limit.findFirst({ where: { key: expr.key }})
    if (!lim) return { pass: false, reason: 'no_limit' }
    const v = Number(lim.value)
    const pass = (expr.op === '<=') ? (v <= expr.value) : (v >= expr.value)
    return { pass, reason: `limit ${expr.key}=${v} ${expr.op} ${expr.value}` }
  }

  return { pass: false, reason: 'unknown_expr' }
}
