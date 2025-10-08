# Runbook: RESEARCH_BACKTEST_FAIL

**Severity**: SEV3  
**Category**: Research Operations  
**Owner**: Research Team  
**On-Call**: Primary: @research-team, Secondary: @data-engineering  
**Last Updated**: 2025-01-09

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Name** | `ResearchBacktestFailed` |
| **Threshold** | Backtest job fails or times out >45 minutes |>
| **Impact** | Research productivity, strategy validation delayed |
| **RTO** | 4 hours |
| **RPO** | Backtest can be rerun, historical data preserved |

## Quick Actions

```bash
# Check backtest job status
curl -s http://localhost:3000/api/research/backtests/status | jq '.'

# Get recent failures
curl -s http://localhost:3000/api/research/backtests?status=failed&limit=5 | \
  jq '.backtests[] | {id: .id, strategy: .strategy_name, error: .error_message, started_at: .started_at}'

# Check computational resources
free -h && df -h /var/research/backtests/

# Quick restart of backtest service
sudo systemctl restart adaf-backtest-engine
```

## Alert Description

This alert triggers when research backtesting jobs fail to complete successfully or exceed acceptable runtime thresholds. Backtesting is critical for strategy validation and research workflows, requiring significant computational resources and historical data processing.

Failures can impact research productivity and delay strategy deployment decisions.

## Common Causes

1. **Historical data issues** - Missing, corrupted, or inconsistent market data
2. **Memory exhaustion** - Large datasets or complex strategies consuming all available RAM
3. **Computation timeout** - Long-running backtests exceeding configured limits  
4. **Strategy code errors** - Bugs in strategy logic or parameter configurations
5. **Database connectivity** - Unable to access historical data repositories
6. **Storage limitations** - Insufficient disk space for backtest results and intermediate files

## Diagnostics

### 1. Check Backtest Service Health

```bash
# Service status and recent jobs
curl -s http://localhost:3000/api/research/backtests/health | jq '{
  status: .status,
  active_jobs: .active_jobs,
  queue_depth: .pending_jobs,
  worker_utilization: .worker_utilization_percent,
  last_successful_job: .last_successful_completion
}'

# Get detailed job information
FAILED_JOB=$(curl -s http://localhost:3000/api/research/backtests?status=failed&limit=1 | jq -r '.backtests[0].id')
curl -s "http://localhost:3000/api/research/backtests/$FAILED_JOB" | jq '.'
```

### 2. Resource Analysis

```bash
# Memory and CPU usage during backtests
ps aux | grep -E "(backtest|research)" | head -10
top -b -n1 | grep -E "(backtest|python.*research)"

# Check memory usage pattern
free -m | awk 'NR==2{printf "Memory: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'

# Storage usage in backtest directories  
df -h /var/research/backtests/
du -sh /var/research/backtests/active/*/ 2>/dev/null | head -10>
```

### 3. Historical Data Validation

```bash
# Check data availability for backtest period
curl -s "http://localhost:3000/api/research/data/availability" | jq '{
  total_symbols: .symbol_count,
  date_range: {start: .earliest_date, end: .latest_date},
  missing_data_gaps: .gaps[0:5],
  data_quality_score: .quality_metrics.completeness_percent
}'

# Verify specific symbols used in failed backtest
if [ -n "$FAILED_JOB" ]; then
    SYMBOLS=$(curl -s "http://localhost:3000/api/research/backtests/$FAILED_JOB" | jq -r '.strategy_config.symbols[]' 2>/dev/null)>
    for symbol in $SYMBOLS; do
        echo "Checking data for: $symbol"
        curl -s "http://localhost:3000/api/research/data/$symbol/health" | jq '{symbol: .symbol, completeness: .completeness_percent, last_update: .last_update}'
    done
fi
```

### 4. Strategy Code Analysis

```bash
# Check strategy validation status
curl -s "http://localhost:3000/api/research/strategies/validation" | \
  jq '.strategies[] | select(.validation_status != "valid") | {name: .name, errors: .validation_errors}'

# Get strategy performance metrics
curl -s "http://localhost:3000/api/research/strategies/metrics" | \
  jq '.strategies[] | select(.recent_failure_rate > 0.2) | {name: .name, failure_rate: .recent_failure_rate, avg_runtime: .avg_runtime_minutes}'>

# Review recent strategy code changes
git log --oneline -10 src/strategies/ research/strategies/
```

### 5. Database and Infrastructure Check

```bash
# Test database connectivity for historical data
curl -s "http://localhost:3000/api/research/data/connectivity" | jq '{
  primary_db: .connections.historical_data.status,
  backup_db: .connections.backup_historical.status,
  response_time_ms: .connections.historical_data.response_time_ms
}'

# Check for database locks or slow queries
psql -h localhost -U adaf_research -d adaf_historical -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE application_name LIKE '%backtest%' 
   AND now() - pg_stat_activity.query_start > interval '5 minutes';">

# Network connectivity to data providers
ping -c 3 data-provider-1.adaf.local
curl -I https://api.marketdata.provider.com/health 2>/dev/null || echo "Data provider unreachable">
```

## Immediate Mitigation

### For Resource Exhaustion

```bash
# Check if memory exhaustion is causing failures
MEMORY_USAGE=$(free | awk '/^Mem:/{printf("%.0f", $3/$2*100)}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "High memory usage detected: ${MEMORY_USAGE}%"
    
    # Kill long-running backtest processes
    pkill -f "backtest.*python" -TERM
    sleep 10
    pkill -f "backtest.*python" -KILL 2>/dev/null || true>
    
    # Clean temporary backtest files
    find /tmp -name "backtest_*" -mtime +1 -delete 2>/dev/null>
    find /var/research/backtests/temp/ -name "*.tmp" -mmin +60 -delete 2>/dev/null>
fi

# Check disk space and clean if needed
DISK_USAGE=$(df /var/research/backtests/ | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "High disk usage detected: ${DISK_USAGE}%"
    
    # Clean old backtest results (older than 30 days)
    find /var/research/backtests/completed/ -name "*.pkl" -mtime +30 -delete 2>/dev/null>
    find /var/research/backtests/results/ -name "*" -mtime +30 -delete 2>/dev/null>
fi
```

### For Data Issues

```bash
# Validate and repair data integrity
curl -X POST "http://localhost:3000/api/research/data/repair" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AUTO_DETECT"], "date_range": "last_7d", "repair_gaps": true}'

# Switch to backup data source if primary unavailable
curl -s "http://localhost:3000/api/research/data/sources" | jq '.sources[] | select(.status != "healthy")'

# Enable backup data source if needed
curl -X POST "http://localhost:3000/api/research/data/sources/failover" \
  -H "Content-Type: application/json" \
  -d '{"to_backup": true, "reason": "primary_data_issues"}'
```

### For Failed Jobs Recovery

```bash
# Retry failed backtest with reduced parameters
if [ -n "$FAILED_JOB" ]; then
    echo "Retrying failed job: $FAILED_JOB"
    
    # Get original job config
    ORIGINAL_CONFIG=$(curl -s "http://localhost:3000/api/research/backtests/$FAILED_JOB" | jq '.strategy_config')
    
    # Retry with smaller dataset or shorter timeframe
    curl -X POST "http://localhost:3000/api/research/backtests/retry" \
      -H "Content-Type: application/json" \
      -d "{
        \"original_job_id\": \"$FAILED_JOB\",
        \"modifications\": {
          \"reduce_timeframe\": true,
          \"limit_symbols\": 10,
          \"use_sample_data\": false
        }
      }"
fi
```

## Investigation

### Performance Analysis

```bash
# Analyze backtest performance trends
curl -s "http://localhost:3000/api/research/backtests/analytics/performance?period=7d" | \
  jq '{
    success_rate: .success_rate_percent,
    avg_runtime: .average_runtime_minutes,
    failure_reasons: .failure_breakdown,
    resource_utilization: .resource_usage_trends
  }'

# Check for patterns in failed backtests
curl -s "http://localhost:3000/api/research/backtests/analytics/failures?period=7d" | \
  jq '{
    common_strategies: .most_failed_strategies[0:5],
    time_patterns: .failure_time_distribution,
    error_patterns: .common_error_types
  }'
```

### Strategy-Specific Analysis

```bash
# Analyze specific strategy causing issues
PROBLEMATIC_STRATEGY=$(curl -s "http://localhost:3000/api/research/backtests?status=failed&limit=10" | \
  jq -r '.backtests | group_by(.strategy_name) | map({strategy: .[0].strategy_name, count: length}) | sort_by(-.count) | .[0].strategy')

if [ -n "$PROBLEMATIC_STRATEGY" ]; then
    echo "Most failed strategy: $PROBLEMATIC_STRATEGY"
    
    # Get strategy-specific metrics
    curl -s "http://localhost:3000/api/research/strategies/$PROBLEMATIC_STRATEGY/health" | jq '.'
    
    # Check strategy code complexity
    curl -s "http://localhost:3000/api/research/strategies/$PROBLEMATIC_STRATEGY/metrics" | \
      jq '{
        complexity_score: .code_complexity,
        memory_footprint_mb: .estimated_memory_usage,
        typical_runtime_minutes: .average_execution_time
      }'
fi
```

### Infrastructure Root Cause

```bash
# Check system-level issues
dmesg | tail -20 | grep -E "(killed|memory|oom)"
journalctl -u adaf-backtest-engine --since="1 hour ago" | grep -E "(ERROR|FATAL|killed)"

# Database performance analysis
psql -h localhost -U adaf_research -d adaf_historical -c \
  "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, seq_scan, seq_tup_read
   FROM pg_stat_user_tables 
   WHERE schemaname = 'market_data'
   ORDER BY seq_tup_read DESC LIMIT 10;"

# Check for infrastructure changes
git log --since="24 hours ago" --oneline config/ ops/ infrastructure/
```

## Recovery Actions

### Service Recovery

```bash
# Restart backtest engine with fresh state
sudo systemctl stop adaf-backtest-engine
sleep 5

# Clear any stuck processes
pkill -f "adaf.*backtest" -KILL 2>/dev/null || true>

# Clean up temporary files
rm -rf /tmp/backtest_* /var/run/adaf-backtest-engine.pid 2>/dev/null>

# Restart with monitoring
sudo systemctl start adaf-backtest-engine
sleep 10

# Verify service health
curl -s http://localhost:3000/api/research/backtests/health | jq '.status'
```

### Data Recovery and Refresh

```bash
# Refresh historical data cache
curl -X POST "http://localhost:3000/api/research/data/refresh" \
  -H "Content-Type: application/json" \
  -d '{"symbols": "all", "force": true, "priority": "high"}'

# Rebuild data indexes for performance
curl -X POST "http://localhost:3000/api/research/data/indexes/rebuild" \
  -H "Content-Type: application/json" \
  -d '{"tables": ["daily_prices", "minute_bars"], "background": true}'

# Verify data integrity post-refresh
sleep 30
curl -s "http://localhost:3000/api/research/data/validation/report" | jq '.summary'
```

### Queue Management

```bash
# Clear failed jobs from queue
curl -X DELETE "http://localhost:3000/api/research/backtests/queue/failed"

# Requeue high-priority research jobs
curl -s "http://localhost:3000/api/research/backtests?status=failed&priority=high" | \
  jq -r '.backtests[].id' | while read job_id; do
    echo "Requeuing high-priority job: $job_id"
    curl -X POST "http://localhost:3000/api/research/backtests/$job_id/requeue"
  done
```

## Escalation Criteria

Escalate to **Research Team Lead** if:
- Multiple strategic backtests failing for >4 hours>
- Data corruption detected in historical datasets
- Critical research deliverables at risk (earnings calls, board meetings)
- Infrastructure changes needed for resolution

Escalate to **Data Engineering Team** if:
- Historical data pipeline failures causing backtest issues
- Database performance degradation affecting multiple research workflows
- Data provider connectivity issues requiring infrastructure changes
- Storage infrastructure modifications needed

## Post-Incident Actions

1. **Research Impact Assessment**:
   ```bash
   # Identify affected research projects
   curl -s "http://localhost:3000/api/research/projects/impact-analysis" \
     -H "Content-Type: application/json" \
     -d "{\"incident_period\": {\"start\": \"$(date -d '6 hours ago' -u +%Y-%m-%dT%H:%M:%SZ)\", \"end\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"
   ```

2. **Backtest Queue Recovery**:
   - Prioritize and rerun critical failed backtests
   - Validate all recovered backtest results for accuracy
   - Update research teams on data quality and result reliability

3. **Performance Optimization**:
   - Implement resource limits based on failure analysis
   - Optimize frequently-failed strategies for better performance
   - Update data caching strategies for commonly used datasets

4. **Monitoring Enhancement**:
   - Add alerts for resource utilization trends
   - Implement early warning for data quality degradation
   - Set up automated retry logic for transient failures

## Related Runbooks

- [ALERT_WORKER_LAG](./ALERT_WORKER_LAG.md) - For general worker performance issues
- [ALERT_DQP_FRESHNESS](./ALERT_DQP_FRESHNESS.md) - For data quality problems

## Dashboard Links

- [Research Operations Dashboard](http://grafana.adaf.local/d/research/research-operations)
- [Backtest Performance Dashboard](http://grafana.adaf.local/d/backtests/backtest-performance)
- [Historical Data Health Dashboard](http://grafana.adaf.local/d/data-health/historical-data-health)

## Health Check

Backtest Engine: `http://localhost:3000/api/research/backtests/health`  
Data Status: `http://localhost:3000/api/research/data/status`
