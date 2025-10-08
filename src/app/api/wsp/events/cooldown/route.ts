import { NextRequest } from 'next/server';
import { redisClient } from '@/lib/wsp/cache/redisClient';
import { recordApiHit } from '@/metrics/wsp.metrics';

const TTL = 1800; // 30 minutes

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind');
    if (!kind) return new Response(JSON.stringify({ error: 'missing_kind' }), { status: 400 });
    const key = `wsp:event:cooldown:${kind}`;
    const val = await redisClient.get(key);
    const active = Boolean(val);
    // There's no direct TTL read in this lightweight helper; encode expiry timestamp as value
    let ttl = 0;
    if (val) {
      const exp = Number(val);
      ttl = Math.max(0, Math.floor((exp - Date.now()) / 1000));
    }
    recordApiHit('/api/wsp/events/cooldown', 200, Date.now() - start);
    return new Response(JSON.stringify({ active, ttl }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    recordApiHit('/api/wsp/events/cooldown', 500, Date.now() - start);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind as string | undefined;
    if (!kind) return new Response(JSON.stringify({ error: 'missing_kind' }), { status: 400 });
    const key = `wsp:event:cooldown:${kind}`;
    const exp = Date.now() + TTL * 1000;
    await redisClient.set(key, String(exp), TTL);
    recordApiHit('/api/wsp/events/cooldown', 200, Date.now() - start);
    return new Response(JSON.stringify({ ok: true, ttl: TTL }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    recordApiHit('/api/wsp/events/cooldown', 500, Date.now() - start);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
}
