# Wall Street Pulse (WSP) · ADAF Billions Dashboard

## Resumen
Módulo institucional con feeds ETF, tasas, índices, calendario y motor Auto-React. Score WSPS, señales, métricas, RBAC, i18n y tests.

## Inputs y adaptadores
- ETF Flows: Farside/SoSoValue
- Rates/DXY: FRED/comercial
- Indices: mercado
- Calendar: económico/earnings

## Fórmula WSPS
- Inputs normalizados 0–1
- Pesos: ETF_BTC 0.25, ETF_ETH 0.10, VIX 0.20, DXY 0.15, 2s10s 0.10, SPX/NDX 0.20
- Score = Σ (peso × valor_normalizado) × 100
- Smoothing: EMA(α=0.2) persistido en Redis (key `wsp:wsps:ema`)
- Histeresis ±3 para cambio de banda (`wsp:wsps:band`)
- Color: ≥66 verde, 33–65 amarillo, <33 rojo

## Normalización (v1.3.1)
- VIX/DXY: z-score con estadísticas streaming Welford persistidas en Redis
  - Keys: `wsp:norm:vix:stats`, `wsp:norm:dxy:stats` { mean, m2, count } TTL 24h
  - Fallbacks: VIX mean=18 std=6; DXY mean=100 std=4; clamp z∈[-2.5, +2.5]
- ETF BTC/ETH: escala percentil `clamp((x-p5)/(p95-p5),0,1)` con P² (p=0.05/p=0.95)
  - Keys: `wsp:norm:etf:btc:p5p95`, `wsp:norm:etf:eth:p5p95`
  - Fallbacks: p5=-50M, p95=+250M
- El endpoint `/api/wsp/wsps` reporta `normalization.source: 'redis'|'fallback'`.

## Reglas Auto-React
- Flush-Rebound, Basis Clean, Reduce Leverage, Rotate→RWA
- Señales con rationale, sizing, guardrails

## Endpoints API
- GET /api/wsp/etf?asset=BTC|ETH&window=1d|5d|mtd
- GET /api/wsp/ratesfx
- GET /api/wsp/indices
- GET /api/wsp/calendar?window=7d
- GET /api/wsp/wsps
- POST /api/wsp/events/cooldown { kind } → fija cooldown 30m cross-instancia
- GET  /api/wsp/events/cooldown?kind=… → { active, ttl }
- GET /api/wsp/events

Todas las rutas agregan `X-WSP-Data: stale` si sirvieron datos en modo contingencia (stale-if-error/ETag).

## Métricas
- Shim JSON: GET /api/metrics/wsp
- Prometheus: GET /api/metrics/wsp con `Accept: text/plain`
- Contadores etiquetados (route/adapter/status) e histogramas de latencia
- Gauge `wsp_wsps_score`

## Límites
- Guardrails ADAF, rate limits, cache Redis, ETag, circuit breaker

## Configuración
- Flags/env sugeridos:
  - NEXT_PUBLIC_FF_WSP_ENABLED=true
  - NEXT_PUBLIC_FF_WSP_AUTOREACT=true
  - WSP_ETF_API_URL / WSP_ETF_API_KEY?
  - WSP_RATES_API_URL, WSP_INDICES_API_URL, WSP_CALENDAR_API_URL

## Snapshot
- Botón desde banner, integra con ResearchPanel

## Testing
- Unit: scoring (EMA + histeresis + persistencia), reglas (cooldown/stale), adaptadores (200/304/500, ETag, stale)
- API: rate-limit (429), header X-WSP-Data
- E2E: grid dnd-kit persistente, gating RBAC, banner con ≥2 señales mockeadas
- Cobertura objetivo WSP ≥75%

### Cómo probar local
- Typecheck WSP aislado: pnpm tsc -p tsconfig.build.wsp.json
- Unit tests WSP: pnpm vitest run tests/wsp.*.test.ts
- E2E (si aplica): pnpm playwright test e2e/wsp.spec.ts

## DoD
- Vista operativa, widgets drag & drop, score, señal mock, métricas, i18n, RBAC, tests, README
