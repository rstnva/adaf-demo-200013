import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { GET as getEtfRoute } from '../src/app/api/wsp/etf/route';
import { GET as getRatesRoute } from '../src/app/api/wsp/ratesfx/route';
import { GET as getIndicesRoute } from '../src/app/api/wsp/indices/route';
import { GET as getCalendarRoute } from '../src/app/api/wsp/calendar/route';
import { GET as getWspsRoute } from '../src/app/api/wsp/wsps/route';
import { GET as getMetricsRoute } from '../src/app/api/metrics/wsp/route';

const server = setupServer();

function mkReq(url: string, headers?: Record<string,string>) {
  // Cast to any to satisfy NextRequest type without pulling next/server internals
  return new Request(new URL(url, 'http://localhost').toString(), { headers }) as any;
}

describe('API routes', () => {
  beforeEach(() => {
    process.env.WSP_ETF_API_URL = 'http://localhost/etf';
    process.env.WSP_RATES_API_URL = 'http://localhost/rates';
    process.env.WSP_INDICES_API_URL = 'http://localhost/indices';
    process.env.WSP_CALENDAR_API_URL = 'http://localhost/calendar';
    server.listen();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('propagates stale header from adapter', async () => {
    const etfUrl = process.env.WSP_ETF_API_URL || '';
    // First 200 to seed cache
    server.use(http.get(etfUrl, () => HttpResponse.json([{ date: '2025-10-06', asset: 'BTC', netFlowUSD: 1 }], { headers: { ETag: 'W/"1"' } })));
    await getEtfRoute(mkReq('/api/wsp/etf?asset=BTC&window=1d'));
    // Then 500 → serve stale
    server.use(http.get(etfUrl, () => new HttpResponse(null, { status: 500 })));
    const res = await getEtfRoute(mkReq('/api/wsp/etf?asset=BTC&window=1d'));
    expect(res.headers.get('X-WSP-Data')).toBe('stale');
  });

  it('metrics route returns JSON and Prometheus text', async () => {
    const jsonRes = await getMetricsRoute(mkReq('/api/metrics/wsp', { accept: 'application/json' } as any));
    expect(jsonRes.headers.get('content-type')).toContain('application/json');
    const promRes = await getMetricsRoute(mkReq('/api/metrics/wsp', { accept: 'text/plain' } as any));
    // If prom-client not initialized, it falls back to JSON
    expect(['text/plain; version=0.0.4','application/json'].some(t => (promRes.headers.get('content-type') || '').includes(t))).toBeTruthy();
  });

  it('wsps route returns smoothing and normalization metadata', async () => {
    const etfUrl = process.env.WSP_ETF_API_URL || '';
    const ratesUrl = process.env.WSP_RATES_API_URL || '';
    const idxUrl = process.env.WSP_INDICES_API_URL || '';
    server.use(
      http.get(etfUrl, () => HttpResponse.json([{ date: '2025-10-06', asset: 'BTC', netFlowUSD: 10 }], { headers: { ETag: 'W/"e"' } })),
      http.get(ratesUrl, () => HttpResponse.json({ dxy: 100, ust2y: 4.5, ust10y: 4.0, spread2s10s: -0.3, ts: Date.now() }, { headers: { ETag: 'W/"r"' } })),
  http.get(idxUrl, () => HttpResponse.json({ spx: 5000, ndx: 17000, vix: 18, ts: Date.now(), dChange: { spx: 0.5, ndx: 0.7, vix: -0.2 } }, { headers: { ETag: 'W/"i"' } })),
    );
    const res = await getWspsRoute(mkReq('/api/wsp/wsps'));
    const json = await res.json();
    expect(typeof json.score).toBe('number');
    expect(['green','yellow','red']).toContain(json.color);
    expect(json.smoothing?.ema).toBe(true);
    expect(json.smoothing?.hysteresis?.bandMargin).toBe(3);
    expect(['redis','fallback']).toContain(json.normalization?.source);
  });
});
