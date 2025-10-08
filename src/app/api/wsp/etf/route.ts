// API route: GET /api/wsp/etf
import { NextRequest } from 'next/server';
import { getEtfFlows } from '@/lib/wsp/adapters/etfFlow.adapter';
import { recordApiHit } from '@/metrics/wsp.metrics';
import { tokenBucket } from '@/lib/wsp/cache/redisClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const asset = (searchParams.get('asset') || 'BTC') as 'BTC'|'ETH';
  const window = searchParams.get('window') || '1d';
  try {
    const start = Date.now();
    if (!tokenBucket('route:wsp:etf', 10, 20)) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  const { data, stale } = await getEtfFlows({ asset, window });
    const ms = Date.now() - start;
    recordApiHit('/api/wsp/etf', 200, ms);
  const headers = new Headers({ 'content-type': 'application/json' });
  if (stale) headers.set('X-WSP-Data', 'stale');
  return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    recordApiHit('/api/wsp/etf', 502);
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}
