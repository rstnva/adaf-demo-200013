// In-memory metrics (shim) with optional Prometheus instrumentation.
export const wspMetrics = {
  adapterRequests: 0,
  wspsScore: 0,
  eventsTotal: 0,
  cacheHits: 0,
  apiHits: 0,
};

// Optional Prometheus client (server-only)
let promEnabled = false;
let register: import('prom-client').Registry | undefined;
let counters: {
  adapterRequests?: import('prom-client').Counter<string>;
  apiHits?: import('prom-client').Counter<string>;
  cacheHits?: import('prom-client').Counter<string>;
  eventsTotal?: import('prom-client').Counter<string>;
} = {};
let gauges: { wspsScore?: import('prom-client').Gauge<string> } = {};
let histograms: {
  adapterLatency?: import('prom-client').Histogram<string>;
  apiLatency?: import('prom-client').Histogram<string>;
} = {};

if (typeof window === 'undefined') {
  try {
    // Dynamically import to avoid bundling in client
    const prom = require('prom-client') as typeof import('prom-client');
    register = prom.register as import('prom-client').Registry;
  counters.adapterRequests = new prom.Counter({ name: 'wsp_adapter_requests_total', help: 'Total adapter requests', labelNames: ['adapter','status'] });
  counters.apiHits = new prom.Counter({ name: 'wsp_api_hits_total', help: 'Total API hits for WSP routes', labelNames: ['route','status'] });
  counters.cacheHits = new prom.Counter({ name: 'wsp_cache_hits_total', help: 'Cache hits in WSP adapters', labelNames: ['source'] });
    counters.eventsTotal = new prom.Counter({ name: 'wsp_events_total', help: 'Total WSP notable events' });
    gauges.wspsScore = new prom.Gauge({ name: 'wsp_wsps_score', help: 'Latest WSPS score value' });
  histograms.adapterLatency = new prom.Histogram({ name: 'wsp_adapter_latency_seconds', help: 'Adapter latency seconds', labelNames: ['adapter'], buckets: [0.05,0.1,0.2,0.5,1,2,5] });
  histograms.apiLatency = new prom.Histogram({ name: 'wsp_api_latency_seconds', help: 'API route latency seconds', labelNames: ['route'], buckets: [0.01,0.05,0.1,0.2,0.5,1,2] });
    promEnabled = true;
  } catch {
    promEnabled = false;
  }
}

export function recordApiHit(route?: string, status?: number, durationMs?: number) {
  wspMetrics.apiHits++;
  if (promEnabled && counters.apiHits) counters.apiHits.inc({ route: route || 'unknown', status: String(status || 0) });
  if (promEnabled && histograms.apiLatency && route && typeof durationMs === 'number') histograms.apiLatency.observe({ route }, durationMs / 1000);
}

export function setWspsScore(score: number) {
  wspMetrics.wspsScore = score;
  if (promEnabled && gauges.wspsScore) gauges.wspsScore.set(score);
}

export function recordAdapterRequest(adapter?: string, status?: number, durationMs?: number) {
  wspMetrics.adapterRequests++;
  if (promEnabled && counters.adapterRequests) counters.adapterRequests.inc({ adapter: adapter || 'unknown', status: String(status || 0) });
  if (promEnabled && histograms.adapterLatency && adapter && typeof durationMs === 'number') histograms.adapterLatency.observe({ adapter }, durationMs / 1000);
}

export function recordCacheHit(source: 'redis'|'memory'|'etag'|'other' = 'redis') {
  wspMetrics.cacheHits++;
  if (promEnabled && counters.cacheHits) counters.cacheHits.inc({ source });
}

export function recordEvent() {
  wspMetrics.eventsTotal++;
  if (promEnabled && counters.eventsTotal) counters.eventsTotal.inc();
}

export async function getPromMetrics(): Promise<string | null> {
  if (!promEnabled || !register) return null;
  return await (register as any).metrics();
}
