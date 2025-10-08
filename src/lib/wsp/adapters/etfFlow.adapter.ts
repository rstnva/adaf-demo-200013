import { recordAdapterRequest, recordCacheHit } from '@/metrics/wsp.metrics';
// Adaptador para ETF Flows con validación, cache, ETag, backoff, circuit breaker
import { EtfFlowSchema } from '../schemas/etfFlow.schema';
import { redisClient, tokenBucket, canPassCircuit, reportCircuitFailure, reportCircuitSuccess, fetchWithCacheETag } from '../cache/redisClient';
import type { EtfFlow } from '../../../types/wsp';
import { readPctl, writePctl, NORM_KEYS } from '../norm/store';
import { rollPctl } from '../norm/streaming';

const CACHE_TTL = Number(process.env.WSP_CACHE_TTL_SEC || 180); // segundos
const RATE_KEY = 'wsp:etf';
const ADAPTER = 'etfFlow';

export async function getEtfFlows({ asset, window }: { asset: 'BTC'|'ETH', window: string }): Promise<{ data: EtfFlow[]; stale: boolean }> {
  const ENDPOINT = process.env.WSP_ETF_API_URL || process.env.ETF_FLOW_API_URL || '';
  const API_KEY = process.env.WSP_ETF_API_KEY || process.env.ETF_FLOW_API_KEY || '';
  const cacheKey = `etfFlow:${asset}:${window}`;

  // Rate limit
  if (!tokenBucket(RATE_KEY, 5, 10)) throw new Error('rate_limited');
  // Circuit breaker
  if (!canPassCircuit(ADAPTER)) throw new Error('circuit_open');

  const url = `${ENDPOINT}?asset=${asset}&window=${window}`;
  const headers: Record<string,string> = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  const start = Date.now();
  try {
  const { body, status, stale } = await fetchWithCacheETag(ADAPTER, url, cacheKey, CACHE_TTL, headers);
    const json = JSON.parse(body);
    const parsed = EtfFlowSchema.array().parse(json) as EtfFlow[];
  recordAdapterRequest(ADAPTER, status, Date.now() - start);
  if (status === 304) recordCacheHit('redis');
    if (stale) recordCacheHit('etag');
    reportCircuitSuccess(ADAPTER);
  // Normalization ingest: ETF netFlowUSD P² percentiles for BTC/ETH (fresh only)
  if (!stale && status === 200 && parsed.length > 0) {
    const latest = parsed[0]?.netFlowUSD;
    if (typeof latest === 'number') {
      const key = asset === 'BTC' ? NORM_KEYS.etfBtc : NORM_KEYS.etfEth;
      const prev = await readPctl<{ p5: any; p95: any }>(key);
      const next = rollPctl(latest, prev?.p5, prev?.p95);
      await writePctl(key, next);
    }
  }
  return { data: parsed, stale };
  } catch (e) {
    reportCircuitFailure(ADAPTER);
    recordAdapterRequest(ADAPTER, 500, Date.now() - start);
    throw e;
  }
}
