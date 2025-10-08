// API route: GET /api/wsp/ratesfx
import { NextRequest } from 'next/server';
import { getRatesFx } from '@/lib/wsp/adapters/ratesFx.adapter';
import { recordApiHit } from '@/metrics/wsp.metrics';
import { tokenBucket } from '@/lib/wsp/cache/redisClient';

export async function GET(req: NextRequest) {
  try {
    const start = Date.now();
    if (!tokenBucket('route:wsp:ratesfx', 10, 20)) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
    const { data, stale } = await getRatesFx();
    const ms = Date.now() - start;
    recordApiHit('/api/wsp/ratesfx', 200, ms);
    const headers = new Headers({ 'content-type': 'application/json' });
    if (stale) headers.set('X-WSP-Data', 'stale');
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    recordApiHit('/api/wsp/ratesfx', 502);
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}
