import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getCatalysts } from '../src/lib/wsp/adapters/calendar.adapter';

const server = setupServer();

describe('Adapter: Calendar', () => {
  beforeEach(() => { process.env.WSP_CALENDAR_API_URL = 'http://localhost/calendar'; server.listen(); });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('200 then 304 serves cached payload', async () => {
  const base = process.env.WSP_CALENDAR_API_URL!;
    const etag = 'W/"c"';
    server.use(http.get(base, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('window') !== '7d') return new HttpResponse(null, { status: 400 });
      return HttpResponse.json([{ date: '2025-10-06', title: 'FOMC Meeting', kind: 'FOMC', importance: 'high' }], { headers: { ETag: etag } });
    }));
    const first = await getCatalysts({ window: '7d' });
    expect(first.stale).toBe(false);
    server.use(http.get(base, ({ request }) => new HttpResponse(null, { status: request.headers.get('if-none-match') === etag ? 304 : 500 })));
    const second = await getCatalysts({ window: '7d' });
    expect(second.stale).toBe(false);
  });

  it('500 serves stale when cache exists', async () => {
  const base = process.env.WSP_CALENDAR_API_URL!;
    server.use(http.get(base, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('window') !== '7d') return new HttpResponse(null, { status: 400 });
      return HttpResponse.json([{ date: '2025-10-06', title: 'FOMC Meeting', kind: 'FOMC', importance: 'high' }], { headers: { ETag: 'W/"z"' } });
    }));
    await getCatalysts({ window: '7d' });
    server.use(http.get(base, () => new HttpResponse(null, { status: 500 })));
    const res = await getCatalysts({ window: '7d' });
    expect(res.stale).toBe(true);
  });
});
