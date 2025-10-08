import { redisClient } from '../cache/redisClient';

// In-memory fallback store (per-process)
const mem: Record<string, { value: any; exp: number }> = {};

const TTL_STATS_SEC = 24 * 60 * 60; // 24h

export async function readStats<T = any>(key: string): Promise<T | null> {
  try {
    const s = await redisClient.get(key);
    if (s) return JSON.parse(s) as T;
  } catch {}
  const m = mem[key];
  if (m && m.exp > Date.now()) return m.value as T;
  return null;
}

export async function writeStats<T = any>(key: string, obj: T): Promise<void> {
  const str = JSON.stringify(obj);
  try {
    await redisClient.set(key, str, TTL_STATS_SEC);
  } catch {}
  mem[key] = { value: obj, exp: Date.now() + TTL_STATS_SEC * 1000 };
}

export const NORM_KEYS = {
  vix: 'wsp:norm:vix:stats',
  dxy: 'wsp:norm:dxy:stats',
  etfBtc: 'wsp:norm:etf:btc:p5p95',
  etfEth: 'wsp:norm:etf:eth:p5p95',
} as const;

export async function readPctl<T = any>(key: string): Promise<T | null> {
  try {
    const s = await redisClient.get(key);
    if (s) return JSON.parse(s) as T;
  } catch {}
  const m = mem[key];
  if (m && m.exp > Date.now()) return m.value as T;
  return null;
}

export async function writePctl<T = any>(key: string, obj: T): Promise<void> {
  const str = JSON.stringify(obj);
  try {
    await redisClient.set(key, str, TTL_STATS_SEC);
  } catch {}
  mem[key] = { value: obj, exp: Date.now() + TTL_STATS_SEC * 1000 };
}
