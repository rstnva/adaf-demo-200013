import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getEtfFlows } from '../src/lib/wsp/adapters/etfFlow.adapter';
import * as metrics from '../src/metrics/wsp.metrics';

const server = setupServer();

describe('Adapter: ETF Flows', () => {
  beforeEach(() => {
    process.env.WSP_ETF_API_URL = 'http://localhost/etf';
    server.listen();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('200 then 304 uses cache and not stale', async () => {
  const url = process.env.WSP_ETF_API_URL!;
    const etag = 'W/"abc"';
    server.use(
      http.get(url, () => HttpResponse.json([{ date: '2025-10-06', asset: 'BTC', netFlowUSD: 123 }], { headers: { ETag: etag } })),
    );
    const spyReq = vi.spyOn(metrics, 'recordAdapterRequest');

    const first = await getEtfFlows({ asset: 'BTC', window: '1d' });
    expect(first.stale).toBe(false);
    expect(spyReq).toHaveBeenCalled();

    server.use(
      http.get(url, ({ request }) => {
        if (request.headers.get('if-none-match') === etag) {
          return new HttpResponse(null, { status: 304, headers: { ETag: etag } });
        }
        return HttpResponse.json([], { status: 500 });
      })
    );
    const second = await getEtfFlows({ asset: 'BTC', window: '1d' });
    expect(second.stale).toBe(false);
  });

  it('500 serves stale when cache exists', async () => {
  const url = process.env.WSP_ETF_API_URL!;
    // Seed cache via 200
    server.use(http.get(url, () => HttpResponse.json([{ date: '2025-10-06', asset: 'BTC', netFlowUSD: 10 }], { headers: { ETag: 'W/"a"' } })));
    await getEtfFlows({ asset: 'BTC', window: '1d' });
    // Now 500
    server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));
    const res = await getEtfFlows({ asset: 'BTC', window: '1d' });
    expect(res.stale).toBe(true);
  });
});
