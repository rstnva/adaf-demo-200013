# API 5xx Error Rate Alert - Runbook

**Alert ID**: `api_5xx_rate_high`  
**Severity**: SEV2  
**Trigger**: API 5xx error rate > 1% for 5 minutes  >
**SLO Impact**: API Availability and Error Rate  

## 🎯 Quick Actions

1. **Check system health**: `curl -s http://localhost:3000/api/healthz | jq`
2. **Identify failing routes**: Check `/api/metrics` for error labels
3. **Review recent deployments**: Check `change_logs` table
4. **Engage on-call**: If multiple routes affected or errors persist > 10 minutes>

## 📊 Diagnostic Steps

### 1. Health Check Validation
```bash
# System health overview
curl -s http://localhost:3000/api/healthz | jq '.'

# Expected: {"status": "healthy", "checks": {...}}
# If unhealthy, see specific component failures
```

### 2. Error Rate Analysis
```bash
# Get metrics snapshot
curl -s http://localhost:3000/api/metrics | grep "adaf_api_requests_total"

# Look for labels with status="5xx" and identify route patterns
# Expected output should show which routes have elevated error counts
```

### 3. Log Analysis
```bash
# Recent API errors (last 100 lines)
tail -100 /var/log/adaf/api.log | grep -E "(5[0-9]{2}|ERROR|FATAL)"

# Route-specific analysis
grep -E "POST|GET|PUT|DELETE" /var/log/adaf/api.log | grep "5[0-9]{2}" | tail -20
```

### 4. Database Connection Check
```sql
-- Check for connection issues
SELECT 
  COUNT(*) as total_queries,
  AVG(duration_ms) as avg_duration,
  MAX(duration_ms) as max_duration
FROM query_logs 
WHERE timestamp > NOW() - INTERVAL '10 minutes';>

-- Check for blocking queries
SELECT 
  pid, 
  state, 
  query_start,
  LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 seconds';
```

## 🚨 Mitigation Steps

### Priority 1: Immediate Response (< 5 minutes)

#### A. Route-Specific Issues
If errors concentrated in specific routes:

```bash
# 1. Check if route-specific worker/agent is failing
curl -s http://localhost:3000/api/agents/process | jq '.[] | select(.status != "healthy")'

# 2. Restart specific worker if identified
# (This would be environment-specific command)
systemctl restart adaf-worker-${AGENT_NAME}
```

#### B. Database Connection Issues
If `/api/healthz` shows database failures:

```bash
# 1. Check connection pool status
curl -s http://localhost:3000/api/system/validate | jq '.validations.database_url'

# 2. Restart application if connection pool exhausted
# (Environment-specific restart command)
systemctl restart adaf-api
```

#### C. Redis/Cache Issues
If cache-related errors detected:

```bash
# 1. Check Redis connectivity
redis-cli ping

# 2. Clear cache if corrupted
redis-cli FLUSHALL

# 3. Restart Redis if unresponsive
systemctl restart redis
```

### Priority 2: Stabilization (5-15 minutes)

#### A. Enable Read-Only Mode
If write operations are causing issues:

```bash
# Set maintenance mode via environment variable
export MAINTENANCE_MODE=read_only

# Or via API if available
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H "Content-Type: application/json" \
  -d '{"mode": "read_only", "reason": "5xx_mitigation"}'
```

#### B. Scale Resources
If resource exhaustion detected:

```bash
# Check system resources
top -n1 | head -20
free -h
df -h

# Scale horizontally (if containerized)
kubectl scale deployment adaf-api --replicas=3

# Or restart with increased memory limits
systemctl edit adaf-api  # Increase memory/CPU limits
systemctl restart adaf-api
```

#### C. Temporary Configuration Adjustments
```bash
# Increase timeouts if timeout-related errors
export API_TIMEOUT=30000  # 30 seconds
export DB_TIMEOUT=20000   # 20 seconds

# Reduce worker concurrency if overwhelming system
export WORKER_CONCURRENCY=2

# Apply changes
systemctl restart adaf-api
```

## 🔍 Root Cause Investigation

### 1. Recent Changes Analysis
```sql
-- Check recent deployments/changes
SELECT * FROM change_logs 
WHERE createdAt > NOW() - INTERVAL '2 hours' >
ORDER BY createdAt DESC;

-- Look for patterns around change timing
```

### 2. Performance Correlation
```bash
# CPU and memory trends
curl -s http://localhost:3000/api/metrics | grep -E "(cpu|memory|load)"

# Request rate correlation
curl -s http://localhost:3000/api/metrics | grep "requests_total" | grep -v "5xx"
```

### 3. External Dependencies
```bash
# Check external API health
curl -s https://api.external-service.com/health
curl -s https://data-provider.com/status

# DNS resolution issues
nslookup external-service.com
dig +trace external-service.com
```

## 📈 Recovery Verification

### 1. Metrics Recovery
```bash
# Verify error rate has dropped
watch -n 30 'curl -s http://localhost:3000/api/metrics | grep "5xx" | tail -5'

# Check overall request success rate
curl -s http://localhost:3000/api/metrics | grep "requests_total"
```

### 2. Health Checks
```bash
# All systems green
curl -s http://localhost:3000/api/healthz | jq '.status'

# Response times back to normal
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3000/api/read/kpi/overview
```

### 3. User Impact Assessment
```bash
# Check if user-facing features working
curl -s http://localhost:3000/api/read/dashboard/summary
curl -s http://localhost:3000/api/read/alerts?limit=10
```

## 🚨 Escalation Criteria

### Immediate Escalation (Page Infrastructure Team)
- [ ] Multiple API routes showing 5xx errors simultaneously
- [ ] Database completely unreachable (`/api/healthz` failing)
- [ ] Error rate > 5% for more than 10 minutes>
- [ ] Complete service outage (all endpoints returning 5xx)

### Team-Specific Escalation

#### DQP Team (@dqp-team)
- [ ] Errors concentrated in `/api/read/dqp/*` routes
- [ ] Data freshness alerts also firing
- [ ] ETF flow or market data related errors

#### Research Team (@research-team)
- [ ] Errors in `/api/research/*` or `/api/backtests/*`
- [ ] Strategy execution failures
- [ ] Report generation API errors

#### Infrastructure (@infra-team)
- [ ] Resource exhaustion (CPU > 90%, Memory > 85%)>
- [ ] Database performance degradation
- [ ] Network connectivity issues

## 📋 Incident Closure Checklist

### Required Actions
- [ ] **Metrics Verification**: Error rate back to < 0.1% for 15+ minutes
- [ ] **Health Checks**: All `/api/healthz` components showing "pass"
- [ ] **Log Entry**: Record resolution in `change_logs` table:
  ```sql
  INSERT INTO change_logs (entity, action, description, metadata) VALUES 
  ('Ops', 'INCIDENT_RESOLVED', 'API 5xx rate normalized', '{"alert": "api_5xx_rate_high", "duration_minutes": X, "root_cause": "..."}');
  ```
- [ ] **Stakeholder Update**: Post resolution in `#adaf-alerts` and incident channel
- [ ] **Monitoring**: Verify alerts have cleared in Prometheus/Grafana

### Post-Incident Actions
- [ ] **Root Cause Documentation**: If issue took > 15 minutes to resolve>
- [ ] **Follow-up Tasks**: Create tickets for preventive measures
- [ ] **Runbook Updates**: Note any new diagnostic steps discovered
- [ ] **Post-Mortem Scheduling**: If SEV1-SEV2 or prolonged incident

### Post-Mortem Triggers
- [ ] Incident duration > 15 minutes>
- [ ] Multiple escalations required
- [ ] Customer-facing impact reported
- [ ] Revenue or SLA impact occurred
- [ ] Novel failure mode discovered

## 🔗 Related Resources

### Dashboards
- [API Performance Dashboard](http://grafana:3000/d/api-performance)
- [Error Rate Trends](http://grafana:3000/d/error-trends)
- [Infrastructure Overview](http://grafana:3000/d/infrastructure)

### Documentation
- [API Architecture](../architecture/API.md)
- [Database Schema](../schema/DATABASE.md)
- [Deployment Procedures](../deployment/README.md)

### Tools
- [Health Check Script](../../tools/health_check.sh)
- [Log Analysis Tools](../../tools/log_analyzer.py)
- [Performance Diagnostics](../../tools/perf_check.sh)

---

**Last Updated**: September 30, 2025  
**Next Review**: October 30, 2025  
**Owned By**: Operations Team
