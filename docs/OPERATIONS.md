# OPERACIONES — ADAF v0.9

## Paneles y endpoints
- Grafana: `URL o ruta`
- Prometheus: `URL o ruta`
- Tracing (Jaeger): `URL o ruta`
- Health app: /api/health/app
- Health DB: /api/health/db
- Health Redis: /api/health/redis

## Runbooks
- Ver `RUNBOOK.md` para incidentes, DR (PITR) y chaos.

## Despliegue
- Blue-Green con `scripts/deploy-bluegreen.sh` (canary + rollback).

## Evidencias
- Capturar en `docs/evidence/<fecha>/<area>/` (builds, métricas, capturas, registros de drill).
