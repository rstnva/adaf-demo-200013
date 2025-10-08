// API route: GET /api/wsp/indices
import { NextRequest } from 'next/server';
import { getIndices } from '@/lib/wsp/adapters/indices.adapter';
import { recordApiHit } from '@/metrics/wsp.metrics';
import { tokenBucket } from '@/lib/wsp/cache/redisClient';

export async function GET(req: NextRequest) {
  try {
    const start = Date.now();
    if (!tokenBucket('route:wsp:indices', 10, 20)) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
    const { data, stale } = await getIndices();
    const ms = Date.now() - start;
    recordApiHit('/api/wsp/indices', 200, ms);
    const headers = new Headers({ 'content-type': 'application/json' });
    if (stale) headers.set('X-WSP-Data', 'stale');
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    recordApiHit('/api/wsp/indices', 502);
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}
