# Worker Lag Alert - Runbook

**Alert ID**: `worker_lag_critical`  
**Severity**: SEV2 (lag > 5 minutes) / SEV1 (lag > 15 minutes)  >
**Trigger**: Worker hasn't ticked for more than configured threshold  
**SLO Impact**: Data Processing and System Responsiveness  

## 🎯 Quick Actions

1. **Check agent status**: `curl -s http://localhost:3000/api/agents/process | jq`
2. **Identify lagging workers**: Look for agents with old `last_tick` timestamps
3. **Check system resources**: CPU, memory, and queue depths
4. **Restart lagging workers**: Individual restart or scale up if needed

## 📊 Diagnostic Steps

### 1. Worker Status Analysis

```bash
# Get all agent statuses with tick times
curl -s http://localhost:3000/api/agents/process | jq '.[] | {
  agent: .agent_code,
  status: .status,
  last_tick: .last_tick,
  lag_minutes: (.lag_minutes // "unknown"),
  queue_depth: .queue_depth
} | select(.lag_minutes > 5 or .lag_minutes == "unknown")'>

# Check specific worker details
curl -s "http://localhost:3000/api/agents/process?agent=AGENT_CODE" | jq
```

### 2. System Resource Check

```bash
# Overall system metrics
curl -s http://localhost:3000/api/metrics | grep -E "(cpu_usage|memory_usage|load_average)"

# Worker-specific metrics
curl -s http://localhost:3000/api/metrics | grep "worker" | grep -E "(last_tick|processing_time|error_count)"

# Queue and backlog analysis
curl -s http://localhost:3000/api/metrics | grep -E "(queue_depth|backlog_size|pending_jobs)"
```

### 3. Process Health Check

```bash
# Check if worker processes are running
ps aux | grep adaf-worker | grep -v grep

# Check system load and resources
top -n1 -b | head -20
free -h
iostat -x 1 1
```

### 4. Database Lock Analysis

```sql
-- Check for blocking queries that might affect workers
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process,
  blocked_activity.application_name AS blocked_application,
  blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;

-- Check worker-related table locks
SELECT 
  l.pid,
  l.mode,
  l.locktype,
  l.relation::regclass,
  a.query,
  a.query_start,
  a.application_name
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.relation::regclass::text IN ('signals', 'alerts', 'opportunities', 'metrics')
  AND l.mode IN ('AccessExclusiveLock', 'ShareUpdateExclusiveLock');
```

## 🚨 Mitigation Steps

### Priority 1: Immediate Response (< 3 minutes)

#### A. Restart Lagging Workers

```bash
# Identify the lagging worker
LAGGING_AGENT=$(curl -s http://localhost:3000/api/agents/process | jq -r '.[] | select(.lag_minutes > 5) | .agent_code' | head -1)>

# Restart specific worker
if [ ! -z "$LAGGING_AGENT" ]; then
  echo "Restarting worker: $LAGGING_AGENT"
  systemctl restart adaf-worker-${LAGGING_AGENT}
  
  # Or via API
  curl -X POST http://localhost:3000/api/agents/${LAGGING_AGENT}/restart
fi
```

#### B. Force Worker Tick

```bash
# Trigger immediate processing cycle
curl -X POST http://localhost:3000/api/agents/tick \
  -H "Content-Type: application/json" \
  -d '{"agent": "ALL", "force": true}'

# Check if tick was successful
sleep 30
curl -s http://localhost:3000/api/agents/process | jq '.[] | {agent: .agent_code, last_tick: .last_tick}'
```

#### C. Scale Up Workers

```bash
# If multiple workers lagging, scale up
kubectl scale deployment adaf-workers --replicas=3

# Or add emergency worker instance
export WORKER_MODE=emergency
export WORKER_CONCURRENCY=1
nohup node worker.js &

# Verify additional workers started
curl -s http://localhost:3000/api/agents/process | jq 'length'
```

### Priority 2: Queue Management (3-10 minutes)

#### A. Inspect Processing Queues

```bash
# Check Redis queue depths
redis-cli LLEN processing_queue
redis-cli LLEN signal_processing_queue  
redis-cli LLEN alert_processing_queue

# Check for stuck jobs
redis-cli LRANGE processing_queue 0 10

# Clear excessive backlogs if needed (>1000 items)>
if [ $(redis-cli LLEN processing_queue) -gt 1000 ]; then
  echo "Clearing stuck queue"
  redis-cli DEL processing_queue
fi
```

#### B. Pause Non-Critical Ingestion

```bash
# Temporarily pause high-volume, non-critical agents
curl -X POST http://localhost:3000/api/agents/pause \
  -H "Content-Type: application/json" \
  -d '{
    "agents": ["SOCIAL_SENTIMENT", "NEWS_SCRAPER", "VOLUME_AGGREGATOR"],
    "reason": "worker_lag_mitigation",
    "duration_minutes": 15
  }'

# Verify critical agents still running
curl -s http://localhost:3000/api/agents/process | jq '.[] | select(.critical == true) | {agent: .agent_code, status: .status}'
```

#### C. Adjust Processing Priorities

```bash
# Increase priority for critical data processing
curl -X POST http://localhost:3000/api/admin/priorities \
  -H "Content-Type: application/json" \
  -d '{
    "high_priority": ["MARKET_DATA", "ALERTS", "DQP_MONITOR"],
    "low_priority": ["SOCIAL_SENTIMENT", "NEWS_ANALYSIS"],
    "temporary": true
  }'
```

### Priority 3: Resource Optimization (10-15 minutes)

#### A. Memory Management

```bash
# Check for memory leaks
ps aux | grep adaf-worker | awk '{sum+=$6} END {print "Total Memory:", sum/1024, "MB"}'

# Restart workers with memory issues
for pid in $(ps aux | grep adaf-worker | awk '$6 > 500000 {print $2}'); do>
  echo "Restarting high-memory worker PID: $pid"
  kill -SIGTERM $pid
done
```

#### B. Database Connection Optimization

```bash
# Check connection pool utilization
curl -s http://localhost:3000/api/system/validate | jq '.validations | to_entries[] | select(.key | contains("database"))'

# Restart DB connection pools if needed
curl -X POST http://localhost:3000/api/admin/db/reconnect

# Verify connections recovered
curl -s http://localhost:3000/api/healthz | jq '.checks.database'
```

## 🔍 Root Cause Investigation

### 1. Performance Bottleneck Analysis

```bash
# CPU utilization by process
top -n1 -b | grep adaf-worker | sort -k9 -nr | head -5

# I/O wait and disk usage
iostat -x 1 3 | grep -E "(Device|sda|nvme)"

# Network connectivity delays
ping -c 5 database-host
ping -c 5 redis-host
```

### 2. Application-Level Issues

```bash
# Check for application errors in logs
tail -100 /var/log/adaf/worker.log | grep -E "(ERROR|FATAL|Exception)"

# Memory usage patterns
grep -E "(memory|heap|gc)" /var/log/adaf/worker.log | tail -20

# Processing time analysis
grep "processing_time" /var/log/adaf/worker.log | awk '{sum+=$NF; count++} END {print "Avg processing time:", sum/count, "ms"}'
```

### 3. External Dependency Check

```sql
-- Check for slow queries affecting workers
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time,
  min_exec_time,
  max_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 1000>
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Worker-related table performance
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd
FROM pg_stat_user_tables 
WHERE tablename IN ('signals', 'alerts', 'opportunities')
ORDER BY seq_scan DESC;
```

## 📈 Recovery Verification

### 1. Worker Performance Recovery

```bash
# Monitor tick frequency improvement
watch -n 10 'curl -s http://localhost:3000/api/agents/process | jq ".[] | {agent: .agent_code, lag: .lag_minutes}" | grep -E "lag.*[0-9]" | sort -V'

# Verify queue depths normalizing
watch -n 30 'redis-cli LLEN processing_queue; redis-cli LLEN signal_processing_queue'
```

### 2. System Performance Metrics

```bash
# CPU and memory stabilization
watch -n 30 'top -n1 -b | grep -E "(Cpu|Mem)" | head -2'

# Database performance recovery
curl -s http://localhost:3000/api/metrics | grep -E "(db_query_time|connection_pool)"
```

### 3. Downstream Impact Assessment

```bash
# Check if data processing caught up
curl -s http://localhost:3000/api/read/dqp/overview | jq '.summary.staleness_minutes'

# Verify alerts are processing
curl -s http://localhost:3000/api/read/alerts?limit=5 | jq '.[0].createdAt'

# Test signal generation
curl -s http://localhost:3000/api/agents/MARKET_DATA/tick
```

## 🚨 Escalation Criteria

### Immediate Escalation (Page Infrastructure)

- [ ] Multiple workers lagging > 15 minutes simultaneously>
- [ ] System CPU > 95% or memory > 90% sustained>
- [ ] Database completely unresponsive to worker queries
- [ ] Worker restarts failing consistently

### Team-Specific Escalation

#### Infrastructure Team (@infra-team)

- [ ] Resource exhaustion (CPU, memory, disk I/O)
- [ ] Network connectivity issues
- [ ] Container/VM failures

#### Database Team (@db-team)

- [ ] Database locks blocking worker queries
- [ ] Slow query performance degradation
- [ ] Connection pool exhaustion

#### Development Team (@dev-team)

- [ ] Application-level memory leaks
- [ ] Logic errors causing infinite loops
- [ ] New deployment causing worker issues

## 📋 Incident Closure Checklist

### Required Actions

- [ ] **Worker Status**: All agents lag < 2 minutes for 10+ minutes
- [ ] **Queue Depths**: All processing queues < 50 items
- [ ] **System Resources**: CPU < 70%, Memory < 80%
- [ ] **Data Processing**: No backlog in signals/alerts processing
- [ ] **Log Entry**: Record resolution:

```sql
INSERT INTO change_logs (entity, action, description, metadata) VALUES 
('Workers', 'INCIDENT_RESOLVED', 'Worker lag normalized', 
'{"alert": "worker_lag_critical", "affected_workers": ["..."], "max_lag_minutes": X, "root_cause": "..."}');
```

### Performance Optimization Actions

- [ ] **Resource Tuning**: Adjust worker concurrency if needed
- [ ] **Queue Optimization**: Implement queue prioritization if beneficial
- [ ] **Monitoring Enhancement**: Add worker-specific alerting thresholds
- [ ] **Capacity Planning**: Schedule infrastructure scaling if pattern detected

### Post-Incident Analysis

- [ ] **Trend Analysis**: Check if worker lag is increasing over time
- [ ] **Capacity Review**: Evaluate if current worker allocation is sufficient
- [ ] **Code Review**: Investigate any recent changes affecting worker performance
- [ ] **Alerting Tuning**: Adjust thresholds based on incident learnings

---

**Last Updated**: September 30, 2025  
**Next Review**: October 30, 2025  
**Owned By**: Operations Team
