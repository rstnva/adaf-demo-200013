import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getIndices } from '../src/lib/wsp/adapters/indices.adapter';

const server = setupServer();

describe('Adapter: Indices', () => {
  beforeEach(() => { process.env.WSP_INDICES_API_URL = 'http://localhost/indices'; server.listen(); });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('200 then 304 serves cached payload', async () => {
  const url = process.env.WSP_INDICES_API_URL!;
    const etag = 'W/"i"';
    server.use(http.get(url, () => HttpResponse.json({ spx: 5000, ndx: 17000, vix: 18, ts: Date.now() }, { headers: { ETag: etag } })));
    const first = await getIndices();
    expect(first.stale).toBe(false);
    server.use(http.get(url, ({ request }) => new HttpResponse(null, { status: request.headers.get('if-none-match') === etag ? 304 : 500 })));
    const second = await getIndices();
    expect(second.stale).toBe(false);
  });

  it('500 serves stale when cache exists', async () => {
  const url = process.env.WSP_INDICES_API_URL!;
    server.use(http.get(url, () => HttpResponse.json({ spx: 5000, ndx: 17000, vix: 18, ts: Date.now() }, { headers: { ETag: 'W/"x"' } })));
    await getIndices();
    server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));
    const res = await getIndices();
    expect(res.stale).toBe(true);
  });
});
