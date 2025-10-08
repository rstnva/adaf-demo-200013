import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getRatesFx } from '../src/lib/wsp/adapters/ratesFx.adapter';

const server = setupServer();

describe('Adapter: RatesFx', () => {
  beforeEach(() => { process.env.WSP_RATES_API_URL = 'http://localhost/rates'; server.listen(); });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('200 then 304 serves cached payload', async () => {
  const url = process.env.WSP_RATES_API_URL!;
    const etag = 'W/"r"';
    server.use(http.get(url, () => HttpResponse.json({ dxy: 100, ust2y: 4.5, ust10y: 4.0, spread2s10s: -0.5, ts: Date.now() }, { headers: { ETag: etag } })));
    const first = await getRatesFx();
    expect(first.stale).toBe(false);
    server.use(http.get(url, ({ request }) => new HttpResponse(null, { status: request.headers.get('if-none-match') === etag ? 304 : 500 })));
    const second = await getRatesFx();
    expect(second.stale).toBe(false);
  });

  it('500 serves stale when cache exists', async () => {
  const url = process.env.WSP_RATES_API_URL!;
    server.use(http.get(url, () => HttpResponse.json({ dxy: 100, ust2y: 4.5, ust10y: 4.0, spread2s10s: -0.5, ts: Date.now() }, { headers: { ETag: 'W/"a"' } })));
    await getRatesFx();
    server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));
    const res = await getRatesFx();
    expect(res.stale).toBe(true);
  });
});
