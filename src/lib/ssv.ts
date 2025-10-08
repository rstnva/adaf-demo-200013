// SoSoValue API client with rate limiting and typed responses

const SSV_BASE_URL = 'https://api.sosovalue.xyz/openapi/v2';
const SSV_NEWS_URL = 'https://openapi.sosovalue.com/api/v1';

// Rate limiting: max ~20 requests per minute
let requestCount = 0;
let windowStart = Date.now();
const RATE_LIMIT = 18; // Leave some buffer
const WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit() {
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }
  
  if (requestCount >= RATE_LIMIT) {
    throw new Error('Rate limit exceeded. Please wait before making more requests.');
  }
  requestCount++;
}

export interface CurrentEtfMetrics {
  totalNetAssets: { value: number; unit: string };
  marketCapPercentage: { value: number; unit: string };
  btcHoldings?: { value: number; unit: string };
  ethHoldings?: { value: number; unit: string };
  dailyNetInflow: { value: number; unit: string };
  cumulativeNetInflow: { value: number; unit: string };
  dailyValueTraded: { value: number; unit: string };
  updateTime: string;
}

export interface HistoricalInflow {
  date: string;
  totalNetInflow: number;
  cumNetInflow: number;
  dailyNetInflow: number;
}

export interface NewsItem {
  id: string;
  title: { [lang: string]: string };
  matchedCurrencies: string[];
  sourceLink: string;
  publishTime: string;
  summary?: { [lang: string]: string };
}

export interface SSVResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface SSVEtfMetricsRaw {
  totalNetAssets?: { value: number; unit: string };
  marketCapPercentage?: { value: number; unit: string };
  btcHoldings?: { value: number; unit: string };
  ethHoldings?: { value: number; unit: string };
  dailyNetInflow?: { value: number; unit: string };
  cumulativeNetInflow?: { value: number; unit: string };
  dailyValueTraded?: { value: number; unit: string };
  updateTime?: string;
}

interface SSVHistoricalInflowRaw {
  date: string;
  totalNetInflow?: number;
  cumNetInflow?: number;
  dailyNetInflow?: number;
}

interface SSVNewsRaw {
  id?: string;
  title?: { [lang: string]: string };
  matchedCurrencies?: string[];
  sourceLink?: string;
  publishTime?: string;
  summary?: { [lang: string]: string };
}

interface SSVNewsResponse {
  list?: SSVNewsRaw[];
}

interface SSVCurrencyResponse {
  list?: unknown[];
}

export type EtfType = "us-btc-spot" | "us-eth-spot";

async function ssvFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  checkRateLimit();
  
  const apiKey = process.env.NEXT_PUBLIC_SOSO_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_SOSO_API_KEY is required');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-soso-api-key': apiKey,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result: SSVResponse<T> = await response.json();
  
  if (result.code !== 0) {
    throw new Error(`SSV API Error (${result.code}): ${result.message}`);
  }

  return result.data;
}

export async function fetchCurrentEtfMetrics(type: EtfType): Promise<CurrentEtfMetrics> {
  const data = await ssvFetch<SSVEtfMetricsRaw>(`${SSV_BASE_URL}/etf/currentEtfDataMetrics`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });

  // Transform API response to our interface
  return {
    totalNetAssets: {
      value: data.totalNetAssets?.value || 0,
      unit: data.totalNetAssets?.unit || 'USD'
    },
    marketCapPercentage: {
      value: data.marketCapPercentage?.value || 0,
      unit: '%'
    },
    btcHoldings: type === 'us-btc-spot' ? {
      value: data.btcHoldings?.value || 0,
      unit: 'BTC'
    } : undefined,
    ethHoldings: type === 'us-eth-spot' ? {
      value: data.ethHoldings?.value || 0,
      unit: 'ETH'
    } : undefined,
    dailyNetInflow: {
      value: data.dailyNetInflow?.value || 0,
      unit: data.dailyNetInflow?.unit || 'USD'
    },
    cumulativeNetInflow: {
      value: data.cumulativeNetInflow?.value || 0,
      unit: data.cumulativeNetInflow?.unit || 'USD'
    },
    dailyValueTraded: {
      value: data.dailyValueTraded?.value || 0,
      unit: data.dailyValueTraded?.unit || 'USD'
    },
    updateTime: data.updateTime || new Date().toISOString()
  };
}

export async function fetchHistoricalInflow(type: EtfType, days = 300): Promise<HistoricalInflow[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

  const data = await ssvFetch<SSVHistoricalInflowRaw[]>(`${SSV_BASE_URL}/etf/historicalInflowChart`, {
    method: 'POST',
    body: JSON.stringify({
      type,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }),
  });

  return (data || []).map((item: SSVHistoricalInflowRaw) => ({
    date: item.date,
    totalNetInflow: item.totalNetInflow || 0,
    cumNetInflow: item.cumNetInflow || 0,
    dailyNetInflow: item.dailyNetInflow || 0,
  }));
}

export async function fetchFeaturedNews(pageNum = 1, pageSize = 12): Promise<NewsItem[]> {
  // Use different base URL for news API
  const url = new URL(`${SSV_NEWS_URL}/news/featured`);
  url.searchParams.set('pageNum', pageNum.toString());
  url.searchParams.set('pageSize', pageSize.toString());

  const data = await ssvFetch<SSVNewsResponse>(url.toString());

  return (data.list || []).map((item: SSVNewsRaw) => ({
    id: item.id || Math.random().toString(),
    title: item.title || { en: 'No title available' },
    matchedCurrencies: item.matchedCurrencies || [],
    sourceLink: item.sourceLink || '#',
    publishTime: item.publishTime || new Date().toISOString(),
    summary: item.summary,
  }));
}

// Optional utility for currency listings
export async function listCurrencies(): Promise<unknown[]> {
  try {
    const data = await ssvFetch<SSVCurrencyResponse>('https://openapi.sosovalue.com/openapi/v1/data/default/coin/list');
    return data.list || [];
  } catch (error) {
    console.warn('Currency list not available:', error);
    return [];
  }
}