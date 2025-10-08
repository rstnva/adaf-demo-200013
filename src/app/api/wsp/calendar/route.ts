// API route: GET /api/wsp/calendar
import { NextRequest } from 'next/server';
import { getCatalysts } from '@/lib/wsp/adapters/calendar.adapter';
import { recordApiHit } from '@/metrics/wsp.metrics';
import { tokenBucket } from '@/lib/wsp/cache/redisClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const window = searchParams.get('window') || '7d';
  try {
    const start = Date.now();
    if (!tokenBucket('route:wsp:calendar', 5, 10)) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
    const { data, stale } = await getCatalysts({ window });
    const ms = Date.now() - start;
    recordApiHit('/api/wsp/calendar', 200, ms);
    const headers = new Headers({ 'content-type': 'application/json' });
    if (stale) headers.set('X-WSP-Data', 'stale');
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    recordApiHit('/api/wsp/calendar', 502);
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}
