# ADAF Dashboard - Operational Alerts Documentation

## Overview

This document describes the operational alerting system for ADAF Dashboard Pro, including alert definitions, severity levels, notification channels, and response procedures.

## Alert Categories

### 1. API Performance and Availability
- **HighAPIErrorRate**: Critical when 5xx error rate > 1% for 5 minutes
- **HighAPILatency**: Warning when 95th percentile latency > 2 seconds
- **HighRateLimitBlocks**: Warning when > 100 requests blocked in 10 minutes

### 2. Worker and Agent Health
- **WorkerTickDelay**: Warning when worker hasn't ticked for > 2 minutes
- **CriticalWorkerDelay**: Critical when worker down for > 5 minutes
- **AgentExecutionFailures**: Warning when > 5 agent failures in 15 minutes

### 3. Data Quality and Freshness
- **DataFreshnessIssue**: Warning when data source stale > 2 hours
- **CriticalDataStaleness**: Critical when critical sources stale > 4 hours
- **DQPIncidentsRising**: Warning when > 3 DQP incidents per hour

### 4. Business Logic and Operations
- **BacktestFailures**: Warning on any backtest failures
- **ReportGenerationFailures**: Warning when > 2 report failures per hour
- **OpxTriageBacklog**: Warning when > 50 opportunities need triage

### 5. Infrastructure and Security
- **HighMemoryUsage**: Warning when memory usage > 8GB
- **DatabaseConnectionIssues**: Critical when connection pool 90% full
- **UnusualRateLimitActivity**: Critical on potential attacks
- **CSPViolationsSpike**: Warning on security policy violations

## Severity Levels

### 🚨 Critical
- **Response Time**: Immediate (< 15 minutes)
- **Escalation**: Page on-call engineer
- **Channels**: Slack #alerts-critical, PagerDuty
- **Examples**: API completely down, database unreachable, critical data sources failing

### ⚠️ Warning
- **Response Time**: Within 1 hour
- **Escalation**: Slack notification
- **Channels**: Slack #alerts-general
- **Examples**: High latency, worker delays, data freshness issues

### ℹ️ Info
- **Response Time**: Next business day
- **Escalation**: Log only
- **Channels**: Slack #alerts-info
- **Examples**: Configuration changes, maintenance notifications

### ✅ Resolved
- **Response Time**: Acknowledgment
- **Escalation**: None
- **Channels**: Same as original alert
- **Examples**: Auto-resolution notifications

## Notification Channels

### Slack Integration
- **Primary Channel**: `#adaf-alerts`
- **Critical Channel**: `#adaf-critical`
- **Component Channels**: `#dqp-team`, `#ops-team`

### Webhook Configuration
```bash
# Set Slack webhook URL
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Test notification
./ops/alerts/notify_slack.sh \
  --severity critical \
  --alert-name "TestAlert" \
  --description "Testing alert system" \
  --component system
```

## Runbook Links

### General Procedures
- **High Error Rate**: https://docs.adaf.com/runbooks/high-error-rate
- **Worker Delay**: https://docs.adaf.com/runbooks/worker-delay
- **Data Freshness**: https://docs.adaf.com/runbooks/data-freshness
- **Database Issues**: https://docs.adaf.com/runbooks/database-issues

### Emergency Contacts
- **On-call Engineer**: +1-xxx-xxx-xxxx
- **Slack**: @oncall-engineer
- **Escalation Manager**: manager@adaf.com

## Alert Response Procedures

### 1. Critical Alerts
1. **Acknowledge** the alert within 15 minutes
2. **Assess** the scope and impact
3. **Mitigate** immediate issues
4. **Escalate** if resolution time > 1 hour
5. **Document** incident and root cause
6. **Follow up** with post-mortem if needed

### 2. Warning Alerts
1. **Review** the alert details
2. **Investigate** potential causes
3. **Monitor** for escalation to critical
4. **Address** during business hours if non-urgent
5. **Update** monitoring if false positive

### 3. Info Alerts
1. **Log** the notification
2. **Schedule** review if needed
3. **Update** documentation if configuration change

## Prometheus Configuration

### Alert Rules Location
- **File**: `ops/alerts/alert_rules.yml`
- **Reload**: `curl -X POST http://prometheus:9090/-/reload`

### Metrics Dependencies
The alerts depend on these key metrics:
- `adaf_api_requests_total`
- `adaf_worker_last_tick_timestamp`
- `adaf_data_source_last_update_timestamp`
- `adaf_backtests_total`
- `adaf_system_memory_usage_bytes`

### Testing Alerts
```bash
# Generate test metrics to trigger alerts
curl -X POST http://localhost:3005/api/test/generate-alert-metrics

# Check alert status
curl http://prometheus:9090/api/v1/alerts
```

## Slack Notification Format

### Message Structure
- **Title**: Alert name with severity emoji
- **Description**: Human-readable problem description
- **Fields**: Component, instance, value, severity
- **Actions**: Links to runbook and dashboard
- **Footer**: Timestamp and source system

### Example Message
```
🚨 CRITICAL ALERT: HighAPIErrorRate
API error rate exceeded threshold

Component: 🌐 api
Instance: prod-api-01
Value: 7.2%
Severity: 🚨 critical

[📖 Runbook] [📊 Dashboard]
```

## Maintenance and Updates

### Adding New Alerts
1. Define alert rule in `alert_rules.yml`
2. Add severity and notification routing
3. Create or update runbook documentation
4. Test alert triggering and resolution
5. Update this documentation

### Modifying Thresholds
1. Review historical data and incident patterns
2. Update thresholds in alert rules
3. Test with realistic scenarios
4. Monitor for false positives/negatives
5. Document changes in changelog

### Silence Management
```bash
# Silence alerts during maintenance
curl -X POST http://alertmanager:9093/api/v1/silences \
  -d '{"matchers":[{"name":"alertname","value":"MaintenanceWindow"}]}'
```

## Troubleshooting

### Common Issues

#### 1. Alerts Not Firing
- Check Prometheus is scraping metrics
- Verify alert rule syntax
- Confirm thresholds are realistic
- Check Alertmanager routing

#### 2. Slack Notifications Failing
- Verify webhook URL is correct
- Check network connectivity
- Validate JSON payload format
- Test webhook with curl

#### 3. False Positives
- Review alert thresholds
- Check for environmental factors
- Adjust evaluation periods
- Add label-based filtering

### Debug Commands
```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Validate alert rules
promtool check rules ops/alerts/alert_rules.yml

# Test Slack webhook
./ops/alerts/notify_slack.sh --help
```

## Metrics and KPIs

### Alert System Health
- **Alert Response Time**: Time from firing to acknowledgment
- **False Positive Rate**: Alerts that resolve without intervention
- **Escalation Rate**: Warnings that become critical
- **Coverage**: Percentage of incidents detected by alerts

### Monitoring
- `adaf_alerts_sent_total{severity}`
- `adaf_alert_response_time_seconds`
- `adaf_alert_false_positive_total`

## Contact Information

- **Team Lead**: ops-lead@adaf.com
- **On-call Rotation**: Check PagerDuty schedule
- **Slack**: #adaf-ops-team
- **Emergency**: Use emergency contact procedures

---

**Last Updated**: {{ current_date }}  
**Version**: 1.0.0  
**Review Cycle**: Monthly