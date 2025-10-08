import { NextRequest } from 'next/server';
import { wspMetrics, getPromMetrics } from '@/metrics/wsp.metrics';

export async function GET(req: NextRequest) {
  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/plain')) {
    const prom = await getPromMetrics();
    if (prom) return new Response(prom, { status: 200, headers: { 'content-type': 'text/plain; version=0.0.4' } });
  }
  return new Response(JSON.stringify(wspMetrics), { status: 200, headers: { 'content-type': 'application/json' } });
}
