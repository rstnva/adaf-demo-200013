// Prometheus-like metrics placeholder (in-memory counters)
// Nota: En despliegue, conecta con Prometheus client si está disponible.
export const wspMetrics = {
  adapterRequests: 0,
  adapterLatency: 0,
  wspsScore: 0,
  eventsTotal: 0,
  cacheHits: 0,
  apiHits: 0,
};

export function recordApiHit() {
  wspMetrics.apiHits++;
}

export function setWspsScore(score: number) {
  wspMetrics.wspsScore = score;
}
