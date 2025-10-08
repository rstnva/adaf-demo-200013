// API route: GET /api/wsp/wsps
import { NextRequest } from 'next/server';
import { calculateWSPS, smoothAndHysteresis, normalizeInputs } from '@/components/dashboard/wsp/utils/scoring';
import { getEtfFlows } from '@/lib/wsp/adapters/etfFlow.adapter';
import { getRatesFx } from '@/lib/wsp/adapters/ratesFx.adapter';
import { getIndices } from '@/lib/wsp/adapters/indices.adapter';
import { recordApiHit } from '@/metrics/wsp.metrics';
import { tokenBucket } from '@/lib/wsp/cache/redisClient';

export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    if (!tokenBucket('route:wsp:wsps', 5, 10)) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });

    // fetch latest feeds
    const [etfBtc, ratesFx, indices] = await Promise.all([
      getEtfFlows({ asset: 'BTC', window: '1d' }),
      getRatesFx(),
      getIndices(),
    ]);

  const stale = Boolean(etfBtc?.stale || ratesFx?.stale || indices?.stale);

  // Strict normalization with Redis-backed stats and fallbacks
  const btcFlow = (etfBtc?.data?.[0]?.netFlowUSD ?? null);
  const vix = indices?.data?.vix ?? null;
  const dxy = ratesFx?.data?.dxy ?? null;
  const spread = ratesFx?.data?.spread2s10s ?? null;
  const mom = indices?.data?.dChange ? { spx: indices.data.dChange.spx, ndx: indices.data.dChange.ndx } : null;
  const { inputs, normalization } = await normalizeInputs({ vix, dxy, etfBtcFlow: btcFlow, etfEthFlow: null, spread2s10s: spread, spxNdXMom: mom });

  const base = calculateWSPS(inputs);
    const smoothed = await smoothAndHysteresis(base.score, 0.2, 3);
    const ms = Date.now() - start;
    recordApiHit('/api/wsp/wsps', 200, ms);

    return new Response(
      JSON.stringify({ score: smoothed.score, color: smoothed.color, factors: base.breakdown, ts: Date.now(), smoothing: smoothed.smoothing, stale, normalization }),
      { status: 200, headers: new Headers({ 'content-type': 'application/json', ...(stale ? { 'X-WSP-Data': 'stale' } : {}) }) }
    );
  } catch (err) {
    recordApiHit('/api/wsp/wsps', 502);
    const message = err instanceof Error ? err.message : 'unknown_error';
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
}
