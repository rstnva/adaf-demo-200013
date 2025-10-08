// lib/stables.ts
// Fetch stablecoin market cap from DefiLlama

export interface StablecoinMcap {
  date: string;
  mcap: number;
}

export async function fetchStablecoinMcap(): Promise<StablecoinMcap[]> {
  // DefiLlama endpoint: https://stablecoins.llama.fi/stablecoincharts/all
  const url = 'https://stablecoins.llama.fi/stablecoincharts/all';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch stablecoin mcap');
  const data = await res.json();
  // Use USDT + USDC + DAI for total
  type LlamaItem = { date: string; total: number };
  const arr: LlamaItem[] = data.total;
  return arr.map((item) => ({
    date: item.date,
    mcap: item.total
  })).slice(-7); // last 7 days
}

// Util: slope3d
export function slope3d(mcaps: StablecoinMcap[]): 'up' | 'flat' | 'down' {
  if (mcaps.length < 3) return 'flat';
  const m0 = mcaps[mcaps.length - 3].mcap;
  const m3 = mcaps[mcaps.length - 1].mcap;
  const pct = (m3 - m0) / m0;
  if (pct > 0.005) return 'up';
  if (pct < -0.005) return 'down';
  return 'flat';
}
