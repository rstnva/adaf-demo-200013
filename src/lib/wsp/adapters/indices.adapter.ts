import { recordAdapterRequest, recordCacheHit } from '../../../metrics/wsp.metrics';
import { IndicesSchema } from '../schemas/indices.schema';
import { redisClient, tokenBucket, canPassCircuit, reportCircuitFailure, reportCircuitSuccess, fetchWithCacheETag } from '../cache/redisClient';
import type { Indices } from '../../../types/wsp';
import { readStats, writeStats, NORM_KEYS } from '../norm/store';
import { updateWelford } from '../norm/streaming';

const CACHE_TTL = Number(process.env.WSP_CACHE_TTL_SEC || 180);
const RATE_KEY = 'wsp:indices';
const ADAPTER = 'indices';

export async function getIndices(): Promise<{ data: Indices; stale: boolean }> {
  const ENDPOINT = process.env.WSP_INDICES_API_URL || process.env.INDICES_API_URL || '';
  const API_KEY = process.env.WSP_INDICES_API_KEY || process.env.INDICES_API_KEY || '';
  const cacheKey = `indices:last`;

  if (!tokenBucket(RATE_KEY, 5, 10)) throw new Error('rate_limited');
  if (!canPassCircuit(ADAPTER)) throw new Error('circuit_open');

  const headers: Record<string,string> = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  const start = Date.now();
  try {
    const { body, status, stale } = await fetchWithCacheETag(ADAPTER, ENDPOINT, cacheKey, CACHE_TTL, headers);
    const json = JSON.parse(body);
    const parsed = IndicesSchema.parse(json) as Indices;
  recordAdapterRequest(ADAPTER, status, Date.now() - start);
  if (status === 304) recordCacheHit('redis');
    if (stale) recordCacheHit('etag');
    reportCircuitSuccess(ADAPTER);
    // Normalization ingest: VIX via Welford (only on fresh data)
    if (!stale && status === 200 && typeof parsed.vix === 'number') {
      const prev = await readStats<{ mean: number; m2: number; count: number }>(NORM_KEYS.vix);
      const next = updateWelford(prev || undefined, parsed.vix);
      await writeStats(NORM_KEYS.vix, next);
    }
    return { data: parsed, stale };
  } catch (e) {
    reportCircuitFailure(ADAPTER);
    recordAdapterRequest(ADAPTER, 500, Date.now() - start);
    throw e;
  }
}
