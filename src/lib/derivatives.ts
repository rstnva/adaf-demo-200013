// lib/derivatives.ts
// Fetch funding rates for BTC/ETH from public API (Deribit fallback, ready for proxy)

export interface FundingRate {
  ts: number;
  symbol: 'BTC' | 'ETH';
  funding8h: number;
}

// Example: Deribit public endpoint (no key required for recent funding)
// If you want to use a paid API, create /app/api/funding/route.ts as proxy
export async function fetchFundingRate(symbol: 'BTC' | 'ETH'): Promise<FundingRate[]> {
  // Deribit: https://www.deribit.com/api/v2/public/get_funding_rate_history?instrument_name=BTC-PERPETUAL
  const inst = symbol === 'BTC' ? 'BTC-PERPETUAL' : 'ETH-PERPETUAL';
  const url = `https://www.deribit.com/api/v2/public/get_funding_rate_history?instrument_name=${inst}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch funding rate');
  const data = await res.json();
  // Normalize to FundingRate[]
  type DeribitFunding = { timestamp: number; funding_rate: number };
  const arr: DeribitFunding[] = data.result.data;
  return arr.slice(-6).map((item) => ({
    ts: item.timestamp,
    symbol,
    funding8h: item.funding_rate * 100 // percent
  }));
}

// Util: fundingSign(last48h)
export function fundingSign(rates: FundingRate[]): 'negativo' | 'neutro' | 'positivo' {
  const avg = rates.reduce((acc, r) => acc + r.funding8h, 0) / rates.length;
  if (avg < -0.01) return 'negativo';
  if (avg > 0.01) return 'positivo';
  return 'neutro';
}
