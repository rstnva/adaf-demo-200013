# Contexto de Copilot

## Objetivo inmediato

- Mantener dashboard estable (Next 14 + TS + shadcn/Tailwind).
- Seguir patrón actual: /api/* en Next, Prisma, raw SQL si el modelo no está en Prisma.
- Respetar guardrails: slippage≤0.5, LTV≤0.35, HF≥1.6, RealYield≥0.6.
- Mantener worker tick accesible por POST /api/agents/process, Prometheus en /api/metrics.

## Convenciones

- Signals ETF: type='offchain', metadata.asset, metadata.netInUsd.
- News: type='news.headline'.
- On-chain TVL: type='onchain.tvl.point', metadata.protocol, metadata.value.
- Alertas: severity 'low'|'med'|'high', acknowledged/resolved.

## Al terminar cada tarea

- Correr smoke script correspondiente (si existe).
- Asegurar typecheck limpio.
- No introducir ‘any’ sin necesidad.
