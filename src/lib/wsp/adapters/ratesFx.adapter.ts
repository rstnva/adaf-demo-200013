import { recordAdapterRequest, recordCacheHit } from '../../../metrics/wsp.metrics';
import { RatesFxSchema } from '../schemas/ratesFx.schema';
import { redisClient, tokenBucket, canPassCircuit, reportCircuitFailure, reportCircuitSuccess, fetchWithCacheETag } from '../cache/redisClient';
import type { RatesFx } from '../../../types/wsp';
import { readStats, writeStats, NORM_KEYS } from '../norm/store';
import { updateWelford } from '../norm/streaming';

const CACHE_TTL = Number(process.env.WSP_CACHE_TTL_SEC || 180);
const RATE_KEY = 'wsp:rates';
const ADAPTER = 'ratesFx';

export async function getRatesFx(): Promise<{ data: RatesFx; stale: boolean }> {
  const ENDPOINT = process.env.WSP_RATES_API_URL || process.env.RATES_FX_API_URL || '';
  const API_KEY = process.env.WSP_RATES_API_KEY || process.env.RATES_FX_API_KEY || '';
  const cacheKey = `ratesFx:last`;

  if (!tokenBucket(RATE_KEY, 5, 10)) throw new Error('rate_limited');
  if (!canPassCircuit(ADAPTER)) throw new Error('circuit_open');

  const headers: Record<string,string> = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  const start = Date.now();
  try {
    const { body, status, stale } = await fetchWithCacheETag(ADAPTER, ENDPOINT, cacheKey, CACHE_TTL, headers);
    const json = JSON.parse(body);
    const parsed = RatesFxSchema.parse(json) as RatesFx;
  recordAdapterRequest(ADAPTER, status, Date.now() - start);
  if (status === 304) recordCacheHit('redis');
    if (stale) recordCacheHit('etag');
    reportCircuitSuccess(ADAPTER);
    // Normalization ingest: DXY via Welford on fresh data
    if (!stale && status === 200 && typeof parsed.dxy === 'number') {
      const prev = await readStats<{ mean: number; m2: number; count: number }>(NORM_KEYS.dxy);
      const next = updateWelford(prev || undefined, parsed.dxy);
      await writeStats(NORM_KEYS.dxy, next);
    }
    return { data: parsed, stale };
  } catch (e) {
    reportCircuitFailure(ADAPTER);
    recordAdapterRequest(ADAPTER, 500, Date.now() - start);
    throw e;
  }
}
