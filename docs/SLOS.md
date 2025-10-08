# SLIs/SLOs — ADAF v0.9

## Disponibilidad
- SLI: uptime mensual por endpoint crítico
- SLO: 99.9%
- Alertas: P0 < 99.5%, P1 < 99.7%

## Rendimiento (WSPS)
- SLI: p95 latencia paneles críticos
- SLO: p95 ≤ 450 ms
- Guardrails: p99 ≤ 800 ms, error rate < 1%

## Datos
- SLI: integridad de pipelines (% batches completos)
- SLO: ≥ 99.99%
- Alertas: caída > 0.5% en 1h

## Despliegue
- SLI: duración canary, tasa de rollback
- SLO: 0 downtime; rollback < 60 s

## Recuperación
- SLI: tiempos de RPO/RTO medidos en drills
- SLO: RPO ≤ 5 min, RTO ≤ 60 s
