import { recordAdapterRequest, recordCacheHit } from '../../../metrics/wsp.metrics';
import { CalendarSchema } from '../schemas/calendar.schema';
import { redisClient, tokenBucket, canPassCircuit, reportCircuitFailure, reportCircuitSuccess, fetchWithCacheETag } from '../cache/redisClient';
import type { Catalyst } from '../../../types/wsp';

const CACHE_TTL = Number(process.env.WSP_CACHE_TTL_SEC || 300);
const RATE_KEY = 'wsp:calendar';
const ADAPTER = 'calendar';

export async function getCatalysts({ window }: { window: string }): Promise<{ data: Catalyst[]; stale: boolean }> {
  const ENDPOINT = process.env.WSP_CALENDAR_API_URL || process.env.CALENDAR_API_URL || '';
  const API_KEY = process.env.WSP_CALENDAR_API_KEY || process.env.CALENDAR_API_KEY || '';
  const cacheKey = `calendar:${window}`;

  if (!tokenBucket(RATE_KEY, 2, 4)) throw new Error('rate_limited');
  if (!canPassCircuit(ADAPTER)) throw new Error('circuit_open');

  const headers: Record<string,string> = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  const start = Date.now();
  try {
    const { body, status, stale } = await fetchWithCacheETag(ADAPTER, `${ENDPOINT}?window=${window}`, cacheKey, CACHE_TTL, headers);
    const json = JSON.parse(body);
    const parsed = CalendarSchema.parse(json) as Catalyst[];
  recordAdapterRequest(ADAPTER, status, Date.now() - start);
  if (status === 304) recordCacheHit('redis');
    if (stale) recordCacheHit('etag');
    reportCircuitSuccess(ADAPTER);
    return { data: parsed, stale };
  } catch (e) {
    reportCircuitFailure(ADAPTER);
    recordAdapterRequest(ADAPTER, 500, Date.now() - start);
    throw e;
  }
}
