// Lightweight Redis helpers; use ioredis when available in runtime.
import type Redis from 'ioredis';

let client: Redis | null = null;
// In-memory fallback with TTL when no Redis client is set (useful for tests/dev)
const memStore = new Map<string, { v: string; exp: number }>();
export function setRedisClient(c: Redis) { client = c; }

export const redisClient = {
  async get(key: string): Promise<string | null> {
    if (!client) {
      const e = memStore.get(key);
      if (!e) return null;
      if (Date.now() > e.exp) { memStore.delete(key); return null; }
      return e.v;
    }
    return await client.get(key);
  },
  async set(key: string, value: string, ttlSec: number): Promise<void> {
    if (!client) {
      memStore.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
      return;
    }
    await client.set(key, value, 'EX', ttlSec);
  },
  async del(key: string): Promise<void> {
    if (!client) { memStore.delete(key); return; }
    await client.del(key);
  },
};

// Token bucket rate limiter (in-memory per process)
type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();
export function tokenBucket(key: string, ratePerSec: number, burst: number): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: burst, lastRefill: now };
    buckets.set(key, b);
  }
  const elapsed = (now - b.lastRefill) / 1000;
  b.tokens = Math.min(burst, b.tokens + elapsed * ratePerSec);
  b.lastRefill = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}

// Circuit breaker per adapter
type CBState = 'closed' | 'open' | 'half-open';
interface Breaker { state: CBState; failures: number; nextTry: number }
const breakers = new Map<string, Breaker>();

export function canPassCircuit(name: string): boolean {
  const b = breakers.get(name);
  if (!b) return true;
  if (b.state === 'open' && Date.now() < b.nextTry) return false;
  if (b.state === 'open' && Date.now() >= b.nextTry) {
    b.state = 'half-open';
    breakers.set(name, b);
  }
  return true;
}

export function reportCircuitSuccess(name: string) {
  breakers.set(name, { state: 'closed', failures: 0, nextTry: 0 });
}

export function reportCircuitFailure(name: string, baseBackoffMs = 1000) {
  const b = breakers.get(name) || { state: 'closed', failures: 0, nextTry: 0 };
  const failures = b.failures + 1;
  const jitter = Math.floor(Math.random() * 250);
  const backoff = Math.min(60000, baseBackoffMs * Math.pow(2, failures)) + jitter;
  const state: CBState = failures >= 3 ? 'open' : 'closed';
  const nextTry = Date.now() + backoff;
  breakers.set(name, { state, failures, nextTry });
}

// Fetch with ETag + Redis cache + stale-if-error
export async function fetchWithCacheETag(
  adapterName: string,
  url: string,
  cacheKey: string,
  ttlSec: number,
  headers: Record<string, string> = {}
): Promise<{ body: string; status: number; stale: boolean }> {
  const etagKey = `${cacheKey}:etag`;
  const prevEtag = await redisClient.get(etagKey);
  const hdrs = new Headers(headers);
  if (prevEtag) hdrs.set('If-None-Match', prevEtag);

  const start = Date.now();
  try {
    const res = await fetch(url, { headers: hdrs });
    const status = res.status;
    if (status === 304) {
      const cached = await redisClient.get(cacheKey);
      if (cached) return { body: cached, status, stale: false };
    }
    if (!res.ok) throw new Error(`HTTP ${status}`);
    const body = await res.text();
    const etag = res.headers.get('etag');
    await redisClient.set(cacheKey, body, ttlSec);
    if (etag) await redisClient.set(etagKey, etag, ttlSec);
    return { body, status, stale: false };
  } catch (e) {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      // serve stale up to 10 minutes past ttl
      return { body: cached, status: 200, stale: true };
    }
    throw e;
  } finally {
    // noop; latency is measured by caller via metrics helper
  }
}
