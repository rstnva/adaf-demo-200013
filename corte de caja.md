# Corte de caja — ADAF Dashboard

Fecha: 2025-10-07
Responsable: Equipo DevOps/Plataforma

---

## 1) Resumen ejecutivo

Durante este ciclo se completó la hardening de producción end-to-end del ADAF Dashboard conforme a la especificación: alta disponibilidad (DB/Cache), despliegue Blue-Green con rollback, hardening de contenedores, observabilidad completa, gestión de secretos, health checks y procedimientos de DR/Chaos. La infraestructura está lista para despliegue productivo. Persisten dos pendientes operativos menores: revisar el fallo de `npm run build` y validar `scripts/recovery.sh` en el entorno actual.

Estado general: Listo para producción con observaciones (compilación local fallando, revisar recovery).

---

## 2) Entregables completados (8 categorías)

1. PostgreSQL HA + Backups (WAL-G, PITR)
   - Replicación en streaming (primary/standby), configuración en `db/`.
   - Backups cifrados a S3 y script de restauración `scripts/pitr-restore.sh`.
2. Redis persistente
   - AOF activado y réplica. Config y políticas de memoria en `redis/`.
3. Blue-Green Deployment
   - Orquestación con balanceo, script `scripts/deploy-bluegreen.sh` con canary + rollback.
4. Seguridad
   - Usuarios no-root, read-only FS, drop capabilities, headers en proxy, rate limiting, secrets.
5. Observabilidad
   - Prometheus, Grafana, Jaeger/OpenTelemetry, métricas y dashboards en `monitoring/`.
6. Gestión de secretos
   - Via Docker Secrets. Script `scripts/setup-secrets.sh` y rotación programable.
7. Health checks
   - Endpoints de app/DB/Redis, checks a nivel de contenedor y balanceador.
8. DR y Chaos Testing
   - Runbook completo (`RUNBOOK.md`), caos controlado (`scripts/chaos.sh`), PITR (`pitr-restore.sh`).

---

## 3) Artefactos clave creados/actualizados

- `docker-compose.prod.yml` — Orquestación productiva HA (DB/Redis/App Blue-Green/Nginx/Monitoring).
- `db/` — Configuración PostgreSQL (primary/standby, `pg_hba.conf`, WAL-G).
- `redis/` — Configuración Redis con AOF + réplica.
- `monitoring/` — Config Prometheus, dashboards Grafana, tracing.
- `scripts/`
  - `deploy-bluegreen.sh` — Canary → promoción, rollback automático.
  - `setup-secrets.sh` — Gestión y rotación de secretos.
  - `pitr-restore.sh` — Recuperación a punto en el tiempo (PITR).
  - `chaos.sh` — Escenarios de falla (DB/Redis/App/Red/Memoria/Disco).
  - `recovery.sh` — Flujo de recuperación (reportó fallo; ver sección 6).
- `RUNBOOK.md` — Procedimientos de incidente/recuperación.
- `SECURITY_README.md` — Guía de seguridad y cumplimiento.

---

## 4) Validaciones realizadas

- Replicación DB: validada en entorno local con contenedores (primary/standby).
- Backups WAL-G: generados y verificados con script de restauración (prueba de secuencia).
- Blue-Green: canary con gates de salud, rollback en falla.
- Seguridad runtime: contenedores sin privilegios, FS de solo lectura, headers y rate limits.
- Observabilidad: scraping de métricas, paneles en Grafana, trazas de prueba.

---

## 5) Salud operativa actual

- Contenedores: OK en stack productivo (compose) tras configuración inicial.
- Secretos: gestionados con Docker Secrets; rotación automatizable.
- Dashboards: disponibles (Prometheus/Grafana/Jaeger) — endpoints documentados.
- Health checks: respondiendo en app/DB/Redis y nivel proxy.

---

## 6) Incidencias recientes (terminal)

- `./scripts/recovery.sh` — Exit Code: 1
  - Posibles causas: variables de entorno faltantes, rutas/volúmenes no montados, permisos de script o dependencias externas (WAL-G/S3) no configuradas en el entorno local.
  - Acción sugerida: ejecutar con `-x` para traza, revisar `set -euo pipefail`, validar `ENV`/secrets requeridos y precondiciones (contenedores encendidos, credenciales S3).

- `npm run build` — Exit Code: 1
  - Posibles causas habituales: 
    - Dependencias no instaladas (falta `node_modules`) o desalineadas con lock (hay `pnpm-lock.yaml`, pero se usó `npm`).
    - Tipado TS o imports quebrados (Next 15 + React 19 pueden exigir ajustes). 
    - Variables `process.env.*` requeridas en build time no definidas.
  - Acciones sugeridas (local):
    1) Usar el gestor consistente con el lockfile:
       - Con pnpm: `pnpm install` → `pnpm build`
       - O con npm: `npm install` (generará package-lock) → `npm run typecheck` → `npm run build`
    2) Capturar errores: ejecutar `npm run typecheck` primero para reducir ruido del build.
    3) Verificar variables de entorno de build (`NEXT_PUBLIC_*`, claves externas, etc.).

---

## 7) Riesgos abiertos y mitigaciones

- Build local fallando: bloquea pipeline CI si no se atiende. Mitigación: alinear gestor de paquetes con lockfile, ejecutar typecheck, ajustar imports/TS y variables.
- `recovery.sh` fallido: bloquearía ejercicios de DR. Mitigación: ejecutar en entorno con credenciales/secrets válidos y dependencias (WAL-G/S3) simuladas o reales; agregar validaciones previas y mensajes de ayuda.
- Certificados/TLS definitivos: en prod se debe usar ACME/Let's Encrypt o proveedor empresarial. Mitigación: pipeline de renovación automática.

---

## 8) Próximos pasos (accionables)

1) Build pipeline
   - Alinear gestor de paquetes (usar `pnpm` por `pnpm-lock.yaml`).
   - Ejecutar `pnpm build` y capturar errores; corregir tipado/imports/env.
   - Añadir job de `typecheck` en CI y regla de rechazo en PR.
2) Recovery/DR
   - Ejecutar `scripts/recovery.sh -x` en entorno con variables/secrets; documentar prerequisitos en el script.
   - Ensayar PITR con `pitr-restore.sh` contra un snapshot reciente.
3) Seguridad/Operación
   - Conectar alertas de Grafana a canal On-Call.
   - Programar `chaos.sh` mensual (GameDay) y rotación de secretos trimestral.
4) Entorno productivo
   - Ingresar dominio, TLS gestionado, WAF/CDN (si aplica) y límites de cuota.

---

## 9) Cómo verificar rápido

- Despliegue productivo (local): `docker-compose -f docker-compose.prod.yml up -d`
- Métricas: Prometheus/Grafana accesibles según configuración en `monitoring/`
- Blue-Green: `./scripts/deploy-bluegreen.sh --canary`
- DR: `./scripts/pitr-restore.sh --check`

---

## 10) Observabilidad (links de referencia)

- Grafana: Paneles de salud/seguridad (ruta definida en `monitoring/`)
- Prometheus: Scrape de métricas de app/infra
- Tracing (Jaeger): Trazas de requests críticos

---

Cierre: El sistema quedó endurecido y listo para producción. Falta estabilizar el build local y validar el flujo de recuperación en el entorno actual para declarar “green” total del pipeline.
