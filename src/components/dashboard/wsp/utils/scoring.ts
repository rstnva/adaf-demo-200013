// Cálculo WSPS (Wall Street Pulse Score)
import { WSPS_WEIGHTS, WSPS_THRESHOLDS } from './thresholds';
import { redisClient } from '@/lib/wsp/cache/redisClient';
import { setWspsScore } from '@/metrics/wsp.metrics';
import { readStats, readPctl, NORM_KEYS } from '@/lib/wsp/norm/store';
import { WelfordState } from '@/lib/wsp/norm/streaming';

type Inputs = {
  ETF_BTC_FLOW_NORM: number;
  ETF_ETH_FLOW_NORM: number;
  VIX_NORM: number;
  DXY_NORM: number;
  SPREAD_2s10s_NORM: number;
  SPX_NDX_MOM_NORM: number;
};

export function calculateWSPS(inputs: Inputs) {
  const factors = [
    { name: 'ETF_BTC', value: inputs.ETF_BTC_FLOW_NORM, weight: WSPS_WEIGHTS.ETF_BTC },
    { name: 'ETF_ETH', value: inputs.ETF_ETH_FLOW_NORM, weight: WSPS_WEIGHTS.ETF_ETH },
    { name: 'VIX', value: inputs.VIX_NORM, weight: WSPS_WEIGHTS.VIX },
    { name: 'DXY', value: inputs.DXY_NORM, weight: WSPS_WEIGHTS.DXY },
    { name: 'SPREAD_2s10s', value: inputs.SPREAD_2s10s_NORM, weight: WSPS_WEIGHTS.SPREAD_2s10s },
    { name: 'SPX_NDX', value: inputs.SPX_NDX_MOM_NORM, weight: WSPS_WEIGHTS.SPX_NDX },
  ];
  const breakdown = factors.map(f => ({ ...f, contribution: f.value * f.weight }));
  const score = Math.round(breakdown.reduce((acc, f) => acc + f.contribution, 0) * 100);
  let color: 'green'|'yellow'|'red' = 'red';
  if (score >= WSPS_THRESHOLDS.green) color = 'green';
  else if (score >= WSPS_THRESHOLDS.yellow) color = 'yellow';
  return { score, color, breakdown };
}

// EMA smoothing and hysteresis helpers
const EMA_KEY = 'wsp:wsps:ema';
const BAND_KEY = 'wsp:wsps:band';
let memEma: number | null = null;
let memBand: 'green'|'yellow'|'red' | null = null;

export async function smoothAndHysteresis(scoreRaw: number, alpha = 0.2, bandMargin = 3) {
  const prevStr = await redisClient.get(EMA_KEY);
  const prevBandStr = await redisClient.get(BAND_KEY);
  const prev = prevStr ? Number(prevStr) : (memEma ?? scoreRaw);
  const prevBand = (prevBandStr as any) || memBand || 'red';
  const ema = Math.round((alpha * scoreRaw + (1 - alpha) * prev));

  // Determine desired band from current ema
  const desired: 'green'|'yellow'|'red' = ema >= WSPS_THRESHOLDS.green ? 'green' : ema >= WSPS_THRESHOLDS.yellow ? 'yellow' : 'red';
  // Apply hysteresis: only change if crosses threshold by bandMargin
  let band: 'green'|'yellow'|'red' = prevBand as any;
  if (prevBand === 'yellow') {
    if (ema >= WSPS_THRESHOLDS.green + bandMargin) band = 'green';
    else if (ema < WSPS_THRESHOLDS.yellow - bandMargin) band = 'red';
  } else if (prevBand === 'green') {
    if (ema < WSPS_THRESHOLDS.green - bandMargin) band = desired; // could become yellow or red
  } else { // prev red
    if (ema >= WSPS_THRESHOLDS.yellow + bandMargin) band = desired; // can move to yellow/green
  }

  // Persist with TTL ~24h (86400s); fallback in-memory if Redis missing
  try {
    await redisClient.set(EMA_KEY, String(ema), 86400);
    await redisClient.set(BAND_KEY, band, 86400);
  } catch {
    memEma = ema;
    memBand = band;
  }

  setWspsScore(ema);

  return { score: ema, color: band, smoothing: { ema: true, hysteresis: { bandMargin } } };
}

// Strict normalization using Redis-backed stats with fallbacks
function clamp(x: number, min: number, max: number) { return Math.max(min, Math.min(max, x)); }

export async function normalizeInputs(params: {
  vix?: number | null;
  dxy?: number | null;
  etfBtcFlow?: number | null;
  etfEthFlow?: number | null;
  spread2s10s?: number | null;
  spxNdXMom?: { spx: number; ndx: number } | null;
}) {
  // Read stats
  const [vixStats, dxyStats, btcPctl, ethPctl] = await Promise.all([
    readStats<WelfordState>(NORM_KEYS.vix),
    readStats<WelfordState>(NORM_KEYS.dxy),
    readPctl<{ p5: any; p95: any }>(NORM_KEYS.etfBtc),
    readPctl<{ p5: any; p95: any }>(NORM_KEYS.etfEth),
  ]);

  // Fallbacks
  const fb = {
    vix: { mean: 18, std: 6 },
    dxy: { mean: 100, std: 4 },
    etf: { p5: -50_000_000, p95: 250_000_000 },
  };

  // Compute VIX z-score -> 1 - clamp(z)
  let vixSource: 'redis' | 'fallback' = 'fallback';
  const vixMean = vixStats?.mean ?? fb.vix.mean;
  const vixStd = (vixStats && vixStats.count >= 2) ? Math.sqrt((vixStats.m2) / (vixStats.count - 1)) : fb.vix.std;
  vixSource = vixStats && vixStats.count >= 2 ? 'redis' : 'fallback';
  const zClamp = (z: number) => clamp(z, -2.5, 2.5);
  const VIX_NORM = params.vix != null ? (1 - zClamp((params.vix - vixMean) / (vixStd || 1))) : 0.5;

  // DXY
  let dxySource: 'redis' | 'fallback' = 'fallback';
  const dxyMean = dxyStats?.mean ?? fb.dxy.mean;
  const dxyStd = (dxyStats && dxyStats.count >= 2) ? Math.sqrt((dxyStats.m2) / (dxyStats.count - 1)) : fb.dxy.std;
  dxySource = dxyStats && dxyStats.count >= 2 ? 'redis' : 'fallback';
  const DXY_NORM = params.dxy != null ? (1 - zClamp((params.dxy - dxyMean) / (dxyStd || 1))) : 0.5;

  // ETF percentile scaling
  let btcSource: 'redis' | 'fallback' = 'fallback';
  let ethSource: 'redis' | 'fallback' = 'fallback';
  const btcP5 = btcPctl ? new Number((btcPctl as any).p5?.q?.[2] ?? fb.etf.p5).valueOf() : fb.etf.p5;
  const btcP95 = btcPctl ? new Number((btcPctl as any).p95?.q?.[2] ?? fb.etf.p95).valueOf() : fb.etf.p95;
  const ethP5 = ethPctl ? new Number((ethPctl as any).p5?.q?.[2] ?? fb.etf.p5).valueOf() : fb.etf.p5;
  const ethP95 = ethPctl ? new Number((ethPctl as any).p95?.q?.[2] ?? fb.etf.p95).valueOf() : fb.etf.p95;
  btcSource = btcPctl ? 'redis' : 'fallback';
  ethSource = ethPctl ? 'redis' : 'fallback';

  function scalePctl(x: number | null | undefined, p5: number, p95: number) {
    if (x == null) return 0.5;
    const denom = p95 - p5;
    if (!isFinite(denom) || Math.abs(denom) < 1e-6) {
      // fallback to fixed scale around fallback p5/p95
      return clamp((x - fb.etf.p5) / (fb.etf.p95 - fb.etf.p5), 0, 1);
    }
    return clamp((x - p5) / denom, 0, 1);
  }

  const ETF_BTC_FLOW_NORM = scalePctl(params.etfBtcFlow, btcP5, btcP95);
  const ETF_ETH_FLOW_NORM = scalePctl(params.etfEthFlow, ethP5, ethP95);

  // Simple linear normalizations retained for remaining factors until we add stats
  const SPREAD_2s10s_NORM = params.spread2s10s != null ? clamp((params.spread2s10s + 1) / 2, 0, 1) : 0.5;
  const SPX_NDX_MOM_NORM = params.spxNdXMom ? clamp((params.spxNdXMom.ndx + params.spxNdXMom.spx + 4) / 8, 0, 1) : 0.5;

  const source: 'redis' | 'fallback' = (vixSource === 'redis' || dxySource === 'redis' || btcSource === 'redis' || ethSource === 'redis') ? 'redis' : 'fallback';

  return {
    inputs: { ETF_BTC_FLOW_NORM, ETF_ETH_FLOW_NORM, VIX_NORM, DXY_NORM, SPREAD_2s10s_NORM, SPX_NDX_MOM_NORM },
    normalization: { source },
  };
}

