# DQP Data Freshness Alert - Runbook

**Alert ID**: `dqp_freshness_critical`  
**Severity**: SEV1 (if critical sources) / SEV2 (if standard sources)  
**Trigger**: Data freshness > 120 minutes for critical sources, > 240 minutes for standard  >
**SLO Impact**: Data Quality and Timeliness  

## 🎯 Quick Actions

1. **Check DQP overview**: `curl -s http://localhost:3000/api/read/dqp/overview | jq`
2. **Identify failed sources**: Look for sources with `status: "FAIL"` or high staleness
3. **Check data pipeline health**: Review worker status and ingestion rates
4. **Implement fallback routing**: Switch to backup data sources if available

## 📊 Diagnostic Steps

### 1. DQP Status Overview

```bash
# Get current DQP status
curl -s http://localhost:3000/api/read/dqp/overview | jq '{
  sources: .sources[] | select(.staleness_minutes > 60),>
  failing: .sources[] | select(.status == "FAIL"),
  summary: .summary
}'

# Expected: Identify which specific data sources are stale or failing
```

### 2. Source-Specific Analysis

```bash
# Get detailed source status
curl -s http://localhost:3000/api/read/dqp/sources | jq '.[] | {
  provider: .provider,
  status: .status,
  last_update: .last_update,
  staleness_minutes: .staleness_minutes,
  error_rate: .error_rate
} | select(.staleness_minutes > 120)'>

# Check specific provider health
curl -s "http://localhost:3000/api/read/dqp/sources?provider=PROVIDER_NAME" | jq
```

### 3. Pipeline Health Check

```bash
# Check data ingestion workers
curl -s http://localhost:3000/api/agents/process | jq '.[] | select(.type == "data_ingestion")'

# Worker processing rates
curl -s http://localhost:3000/api/metrics | grep -E "(worker_tick|ingestion_rate|data_points_processed)"

# Queue depths and backlogs
curl -s http://localhost:3000/api/metrics | grep -E "(queue_depth|backlog_size)"
```

### 4. Database Data Analysis

```sql
-- Check recent data points by source
SELECT 
  provider,
  COUNT(*) as recent_points,
  MAX(timestamp) as latest_timestamp,
  EXTRACT(EPOCH FROM (NOW() - MAX(timestamp)))/60 as staleness_minutes
FROM market_data 
WHERE timestamp > NOW() - INTERVAL '4 hours'>
GROUP BY provider
ORDER BY staleness_minutes DESC;

-- Check for gaps in critical series
SELECT 
  series_id,
  COUNT(*) as point_count,
  MIN(timestamp) as first_point,
  MAX(timestamp) as last_point,
  COUNT(DISTINCT DATE(timestamp)) as unique_days
FROM time_series_data 
WHERE timestamp > NOW() - INTERVAL '24 hours'>
  AND series_id IN ('BTC_PRICE', 'ETH_PRICE', 'SPY_PRICE')
GROUP BY series_id;
```

## 🚨 Mitigation Steps

### Priority 1: Immediate Response (< 5 minutes)

#### A. Fallback Data Source Routing

```bash
# Switch to backup provider for critical data
curl -X POST http://localhost:3000/api/admin/dqp/fallback \
  -H "Content-Type: application/json" \
  -d '{
    "primary_provider": "FAILING_PROVIDER",
    "fallback_provider": "BACKUP_PROVIDER",
    "reason": "freshness_alert_mitigation"
  }'

# Verify fallback is active
curl -s http://localhost:3000/api/read/dqp/routing | jq '.active_fallbacks'
```

#### B. Restart Specific Data Workers

```bash
# Identify failing worker
FAILING_AGENT=$(curl -s http://localhost:3000/api/agents/process | jq -r '.[] | select(.status != "healthy") | .agent_code')

# Restart worker (environment specific)
systemctl restart adaf-worker-${FAILING_AGENT}

# Or via API if available
curl -X POST http://localhost:3000/api/agents/${FAILING_AGENT}/restart
```

#### C. Force Data Refresh

```bash
# Trigger immediate data pull for critical sources
curl -X POST http://localhost:3000/api/dqp/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["BTC_PRICE", "ETH_PRICE", "MARKET_DATA"],
    "priority": "high",
    "reason": "freshness_alert"
  }'
```

### Priority 2: Pipeline Recovery (5-15 minutes)

#### A. Reduce Polling Frequency

```bash
# Temporarily reduce polling to avoid overwhelming failing provider
curl -X POST http://localhost:3000/api/admin/dqp/config \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "FAILING_PROVIDER",
    "polling_interval_seconds": 300,
    "temporary": true,
    "duration_minutes": 30
  }'
```

#### B. Scale Data Ingestion Workers

```bash
# Increase worker instances for data ingestion
kubectl scale deployment adaf-data-workers --replicas=3

# Or restart with higher concurrency
export DATA_WORKER_CONCURRENCY=4
systemctl restart adaf-data-workers
```

#### C. Clear Stuck Queues

```bash
# Check for stuck messages in queues
redis-cli LLEN data_ingestion_queue
redis-cli LLEN dqp_processing_queue

# Clear if excessive backlog (>1000 items)>
redis-cli DEL stuck_queue_name

# Restart queue processing
curl -X POST http://localhost:3000/api/admin/queues/restart
```

## 🔍 Root Cause Investigation

### 1. Provider Health Analysis

```bash
# Check external data provider status
curl -s https://api.dataprovider.com/status
curl -s https://api.dataprovider.com/health

# Test API key validity
curl -H "Authorization: Bearer ${API_KEY}" \
  https://api.dataprovider.com/test

# Check rate limiting status
curl -I https://api.dataprovider.com/data/btc | grep -i rate
```

### 2. Network and Connectivity

```bash
# DNS resolution for data providers
nslookup api.dataprovider.com
dig +trace api.dataprovider.com

# Connectivity test
traceroute api.dataprovider.com
curl -w "@curl-format.txt" https://api.dataprovider.com/health

# Check firewall/security group rules
netstat -tulpn | grep :443
iptables -L | grep dataprovider
```

### 3. Data Quality Validation

```sql
-- Check for data anomalies that might cause processing delays
SELECT 
  provider,
  COUNT(*) as total_points,
  COUNT(CASE WHEN value IS NULL THEN 1 END) as null_values,
  COUNT(CASE WHEN value < 0 THEN 1 END) as negative_values,
  AVG(value) as avg_value,
  STDDEV(value) as stddev_value
FROM market_data 
WHERE timestamp > NOW() - INTERVAL '2 hours'>
GROUP BY provider;

-- Check for duplicate timestamps
SELECT 
  provider,
  timestamp,
  COUNT(*) as duplicate_count
FROM market_data 
WHERE timestamp > NOW() - INTERVAL '2 hours'>
GROUP BY provider, timestamp
HAVING COUNT(*) > 1;>
```

## 📈 Recovery Verification

### 1. Data Freshness Recovery

```bash
# Monitor freshness improvement
watch -n 30 'curl -s http://localhost:3000/api/read/dqp/overview | jq ".sources[] | {provider: .provider, staleness: .staleness_minutes}"'

# Verify critical sources are current
curl -s http://localhost:3000/api/read/dqp/sources | jq '.[] | select(.critical == true) | {provider: .provider, status: .status, staleness: .staleness_minutes}'
```

### 2. Data Pipeline Health

```bash
# Check ingestion rates are normal
curl -s http://localhost:3000/api/metrics | grep "data_points_ingested_total"

# Verify queue depths are manageable
curl -s http://localhost:3000/api/metrics | grep "queue_depth" | awk '{print $2}' | sort -n
```

### 3. Downstream Impact Assessment

```bash
# Check if ETF flows are updating
curl -s http://localhost:3000/api/read/etf/flows | jq '.last_updated'

# Verify KPI calculations are current
curl -s http://localhost:3000/api/read/kpi/overview | jq '.last_calculation'

# Test research functionality
curl -s http://localhost:3000/api/research/data/validate
```

## 🚨 Escalation Criteria

### Immediate Escalation (Page DQP Team)

- [ ] Multiple critical data sources failing simultaneously
- [ ] Data freshness > 4 hours for any critical source>
- [ ] Complete data pipeline failure (no ingestion for > 30 minutes)>
- [ ] Cascade failures affecting ETF flows or KPI calculations

### Team-Specific Escalation

#### Infrastructure Team (@infra-team)

- [ ] Network connectivity issues to data providers
- [ ] Database performance affecting data writes
- [ ] Queue/messaging system failures

#### Data Engineering (@data-eng)

- [ ] Data schema or parsing issues
- [ ] Provider API changes breaking ingestion
- [ ] Data quality anomalies causing processing failures

#### External Vendor Escalation

- [ ] Data provider API outage confirmed
- [ ] Rate limiting issues requiring quota increase
- [ ] API key or authentication failures

## 📋 Data Capture Requirements

### Metrics to Record

```bash
# Before mitigation
BEFORE_METRICS=$(curl -s http://localhost:3000/api/read/dqp/overview | jq '{
  failing_sources: [.sources[] | select(.status == "FAIL") | .provider],
  max_staleness: [.sources[].staleness_minutes] | max,
  total_sources: .sources | length
}')

# After recovery
AFTER_METRICS=$(curl -s http://localhost:3000/api/read/dqp/overview | jq '{
  healthy_sources: [.sources[] | select(.status == "OK") | .provider],
  max_staleness: [.sources[].staleness_minutes] | max,
  recovered_at: now
}')
```

### Performance Impact

- Provider response times and error rates
- Data gap duration and affected series
- Downstream systems impact (ETF flows, KPIs, alerts)
- User-facing feature availability

## 📋 Incident Closure Checklist

### Required Actions

- [ ] **Data Freshness**: All critical sources < 30 minutes staleness
- [ ] **DQP Status**: All sources showing "OK" status
- [ ] **Pipeline Health**: Workers processing normally, queues < 100 items
- [ ] **Downstream Verification**: ETF flows and KPIs updating correctly
- [ ] **Log Entry**: Record in `change_logs`:

```sql
INSERT INTO change_logs (entity, action, description, metadata) VALUES 
('DQP', 'INCIDENT_RESOLVED', 'Data freshness restored', 
'{"alert": "dqp_freshness_critical", "affected_sources": ["..."], "duration_minutes": X, "root_cause": "..."}');
```

### Post-Incident Actions

- [ ] **Provider Communication**: Contact data provider if external issue
- [ ] **Monitoring Tuning**: Adjust thresholds if false positive
- [ ] **Fallback Testing**: Verify backup sources work correctly
- [ ] **Documentation Updates**: Update provider contact info and procedures

---

**Last Updated**: September 30, 2025  
**Next Review**: October 30, 2025  
**Owned By**: DQP Team
