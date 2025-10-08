# Runbook: ALERT_REPORT_SCHEDULER

**Severity**: SEV3  
**Category**: Automated Reporting  
**Owner**: Data Engineering Team  
**On-Call**: Primary: @data-engineering, Secondary: @platform-team  
**Last Updated**: 2025-01-09

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Name** | `ReportSchedulerFailed` |
| **Threshold** | Report job failed or delayed >30 minutes |>
| **Impact** | Business reports not delivered to stakeholders |
| **RTO** | 2 hours |
| **RPO** | Daily reports can be regenerated |

## Quick Actions

```bash
# Check report scheduler status
curl -s http://localhost:3000/api/admin/scheduler/status | jq '.'

# Get recent job failures
curl -s http://localhost:3000/api/admin/scheduler/jobs?status=failed&limit=10 | jq '.'

# Check queue depth
redis-cli -h localhost LLEN report_scheduler_queue

# Restart scheduler service (if needed)
sudo systemctl restart adaf-report-scheduler
```

## Alert Description

This alert triggers when the automated report scheduler fails to execute scheduled jobs or when jobs are delayed beyond acceptable thresholds. The report scheduler is responsible for generating and delivering critical business reports on predetermined schedules.

## Common Causes

1. **Database connectivity issues** - Reports unable to query source data
2. **Memory/CPU exhaustion** - Large reports consuming all available resources  
3. **Storage space issues** - Cannot write generated reports to disk
4. **External API failures** - Third-party data sources unavailable
5. **Configuration errors** - Invalid cron expressions or report parameters
6. **Queue backup** - Too many concurrent jobs blocking new ones

## Diagnostics

### 1. Check Scheduler Health

```bash
# Scheduler service status
curl -s http://localhost:3000/api/admin/scheduler/status | jq '{
  status: .status,
  uptime: .uptime,
  active_jobs: .active_jobs,
  queue_depth: .queue_depth,
  last_heartbeat: .last_heartbeat
}'

# Check for failed jobs in last 24h
curl -s "http://localhost:3000/api/admin/scheduler/jobs?status=failed&since=$(date -d '24 hours ago' -u +%Y-%m-%dT%H:%M:%SZ)" | \
  jq '.jobs[] | {id: .id, report_type: .report_type, error: .error_message, failed_at: .failed_at}'
```

### 2. Resource Analysis

```bash
# Check system resources
free -h
df -h /var/adaf/reports/  # Report output directory
iostat -x 1 3  # I/O utilization

# Check scheduler process
ps aux | grep "report-scheduler"
top -p $(pgrep -f report-scheduler)
```

### 3. Database Connectivity

```bash
# Test database connection from scheduler
curl -s http://localhost:3000/api/admin/scheduler/health/database | jq '.'

# Check active database connections
psql -h localhost -U adaf_user -d adaf_prod -c \
  "SELECT state, count(*) FROM pg_stat_activity WHERE application_name LIKE '%scheduler%' GROUP BY state;"

# Check for long-running queries
psql -h localhost -U adaf_user -d adaf_prod -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE application_name LIKE '%scheduler%' 
   AND now() - pg_stat_activity.query_start > interval '5 minutes';">
```

### 4. Queue Analysis

```bash
# Redis queue inspection
redis-cli -h localhost << 'EOF'
LLEN report_scheduler_queue
LLEN report_scheduler_dead_letter
LRANGE report_scheduler_queue 0 5
LRANGE report_scheduler_dead_letter 0 5
EOF

# Check queue processing rate
curl -s http://localhost:3000/api/admin/scheduler/metrics | jq '{
  jobs_per_minute: .processing_rate,
  avg_execution_time: .avg_execution_time_ms,
  success_rate: .success_rate_percent
}'
```

### 5. Storage and Output Analysis

```bash
# Check report output directory
ls -la /var/adaf/reports/$(date +%Y/%m/%d)/ 2>/dev/null || echo "No reports today">

# Check disk space trends
df -h /var/adaf/reports/ | awk 'NR==2 {print "Used:", $3, "Available:", $4, "Use%:", $5}'

# Check file permissions
ls -ld /var/adaf/reports/ /var/adaf/reports/$(date +%Y)/
```

## Immediate Mitigation

### For Failed Report Jobs

```bash
# Get details of most recent failure
FAILED_JOB=$(curl -s http://localhost:3000/api/admin/scheduler/jobs?status=failed&limit=1 | jq -r '.jobs[0].id')
echo "Failed Job ID: $FAILED_JOB"

# Check specific job details
curl -s "http://localhost:3000/api/admin/scheduler/jobs/$FAILED_JOB" | jq '.'

# Retry failed job (if transient issue)
curl -X POST "http://localhost:3000/api/admin/scheduler/jobs/$FAILED_JOB/retry"
```

### For Queue Backup

```bash
# Check queue depth
QUEUE_DEPTH=$(redis-cli -h localhost LLEN report_scheduler_queue)
echo "Current queue depth: $QUEUE_DEPTH"

if [ "$QUEUE_DEPTH" -gt 50 ]; then
    echo "Queue backup detected - consider:"
    echo "1. Scaling up worker processes"
    echo "2. Purging old/invalid jobs"
    echo "3. Temporarily disabling non-critical reports"
    
    # Get queue sample
    redis-cli -h localhost LRANGE report_scheduler_queue 0 10
fi
```

### For Resource Issues

```bash
# If high memory usage
if [ $(free | awk '/^Mem:/{printf("%.0f", $3/$2*100)}') -gt 85 ]; then
    echo "High memory usage detected"
    
    # Kill any runaway report processes
    pkill -f "report-generator" -TERM
    sleep 5
    pkill -f "report-generator" -KILL 2>/dev/null || true>
    
    # Clear old report files
    find /var/adaf/reports/ -name "*.tmp" -mtime +1 -delete
    find /var/adaf/reports/ -name "*.pdf" -mtime +7 -delete
fi
```

## Investigation

### Review Recent Changes

```bash
# Check recent scheduler configuration changes
git log --oneline -10 config/scheduler/
git log --oneline -10 src/services/report-scheduler/

# Check recent deployments
curl -s http://localhost:3000/api/admin/deployments/recent | jq '.[] | select(.components[] | contains("scheduler"))'
```

### Analyze Job Patterns

```bash
# Get job failure patterns
curl -s "http://localhost:3000/api/admin/scheduler/analytics/failures?period=7d" | \
  jq '{
    failure_rate_by_hour: .failure_rate_by_hour,
    most_failed_reports: .top_failed_report_types[0:5],
    common_errors: .common_error_patterns[0:3]
  }'

# Check job execution time trends
curl -s "http://localhost:3000/api/admin/scheduler/analytics/performance?period=7d" | \
  jq '{
    avg_execution_time_trend: .execution_time_trend,
    slowest_reports: .slowest_report_types[0:5]
  }'
```

### Database Performance Review

```bash
# Check report-related query performance
psql -h localhost -U adaf_user -d adaf_prod -c \
  "SELECT query, calls, mean_exec_time, stddev_exec_time 
   FROM pg_stat_statements 
   WHERE query LIKE '%report%' 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;"

# Check for table locks
psql -h localhost -U adaf_user -d adaf_prod -c \
  "SELECT blocked_locks.pid AS blocked_pid,
          blocked_activity.usename AS blocked_user,
          blocking_locks.pid AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query AS blocked_statement
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
   AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
   WHERE NOT blocked_locks.GRANTED;"
```

## Recovery Actions

### Restart Scheduler Service

```bash
# Graceful restart
curl -X POST http://localhost:3000/api/admin/scheduler/shutdown?graceful=true
sleep 30
sudo systemctl restart adaf-report-scheduler

# Verify restart
sleep 10
curl -s http://localhost:3000/api/admin/scheduler/status | jq '.status'
```

### Manual Report Generation

```bash
# Generate critical reports manually if needed
REPORT_DATE=$(date +%Y-%m-%d)

# Daily executive dashboard
curl -X POST "http://localhost:3000/api/admin/reports/generate" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"executive_dashboard\", \"date\": \"$REPORT_DATE\", \"priority\": \"high\"}"

# Portfolio performance report
curl -X POST "http://localhost:3000/api/admin/reports/generate" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"portfolio_performance\", \"date\": \"$REPORT_DATE\", \"priority\": \"high\"}"
```

### Queue Management

```bash
# Clear dead letter queue if full of invalid jobs
DEAD_LETTER_COUNT=$(redis-cli -h localhost LLEN report_scheduler_dead_letter)
if [ "$DEAD_LETTER_COUNT" -gt 100 ]; then
    echo "Clearing $DEAD_LETTER_COUNT dead letter jobs"
    redis-cli -h localhost DEL report_scheduler_dead_letter
fi

# Purge old jobs from main queue (older than 24h)
curl -X POST "http://localhost:3000/api/admin/scheduler/queue/cleanup" \
  -H "Content-Type: application/json" \
  -d "{\"older_than_hours\": 24}"
```

## Escalation Criteria

Escalate to **Data Engineering Lead** if:
- Multiple critical reports (executive, regulatory) failing for >2 hours>
- Scheduler service cannot be restarted successfully
- Database corruption detected in report data tables
- Storage issues affecting all report generation

Escalate to **Infrastructure Team** if:
- System resource exhaustion (CPU >90%, Memory >95%, Disk >95%)>
- Network connectivity issues to external data providers
- Redis cluster failures affecting job queue
- Performance degradation affecting multiple services

## Post-Incident Actions

1. **Schedule Report Backfill**:
   ```bash
   # Generate missing reports for affected period
   curl -X POST "http://localhost:3000/api/admin/reports/backfill" \
     -H "Content-Type: application/json" \
     -d "{\"start_date\": \"2025-01-08\", \"end_date\": \"2025-01-09\", \"report_types\": [\"critical\"]}"
   ```

2. **Verify Report Delivery**:
   - Check email delivery logs for report notifications
   - Verify file uploads to stakeholder portals
   - Confirm data accuracy in generated reports

3. **Update Monitoring**:
   - Review alert thresholds based on incident patterns
   - Add monitoring for identified failure modes
   - Update runbook with new diagnostic steps

4. **Performance Optimization**:
   - Implement query optimizations identified during investigation
   - Adjust scheduler resource limits based on observed usage
   - Consider report caching for frequently accessed data

## Related Runbooks

- [ALERT_API_5XX](./ALERT_API_5XX.md) - For API connectivity issues
- [ALERT_WORKER_LAG](./ALERT_WORKER_LAG.md) - For general worker performance issues  
- [SECURITY_CSP_VIOLATIONS](./SECURITY_CSP_VIOLATIONS.md) - For report delivery security issues

## Dashboard Links

- [Report Scheduler Dashboard](http://grafana.adaf.local/d/report-scheduler/report-scheduler-overview)
- [System Resources Dashboard](http://grafana.adaf.local/d/system/system-overview)
- [Database Performance Dashboard](http://grafana.adaf.local/d/database/database-performance)

## Health Check

Primary: `http://localhost:3000/api/admin/scheduler/health`  
Metrics: `http://localhost:3000/api/admin/scheduler/metrics`
