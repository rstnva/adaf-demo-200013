# ADAF Dashboard - Operations Runbooks

## Overview

This directory contains standardized runbooks for incident response, escalation procedures, and operational troubleshooting. Each runbook follows the "2 clicks to action" principle - every alert should link directly here or to a specific runbook for immediate guidance.

## Available Runbooks

### Critical System Alerts

- [ALERT_API_5XX](./ALERT_API_5XX.md) - API 5xx Error Rate Alert Response
- [ALERT_DQP_FRESHNESS](./ALERT_DQP_FRESHNESS.md) - Data Quality Provider Freshness Alert  
- [ALERT_WORKER_LAG](./ALERT_WORKER_LAG.md) - Worker Processing Lag Alert Response

### Automated Operations

- [ALERT_REPORT_SCHEDULER](./ALERT_REPORT_SCHEDULER.md) - Report Generation Failure Response

### Security Incidents

- [SECURITY_CSP_VIOLATIONS](./SECURITY_CSP_VIOLATIONS.md) - Content Security Policy Violation Response

### Research Operations

- [RESEARCH_BACKTEST_FAIL](./RESEARCH_BACKTEST_FAIL.md) - Research Backtest Failure Response

### Operational Safeguards

- [OPX_BLOCKING_GUARDRAILS](./OPX_BLOCKING_GUARDRAILS.md) - Operational Guardrail Activation Response

### Templates & Procedures

- [templates/POSTMORTEM.md](./templates/POSTMORTEM.md) - Post-mortem template
- [ESCALATION_MATRIX.md](./ESCALATION_MATRIX.md) - Escalation contacts and procedures

## 🚨 Severity Levels

### SEV1 - Critical (< 15 min response)

- **Definition**: Complete service outage or data loss
- **Examples**: API completely down, database unreachable, security breach
- **Response**: Immediate paging, all hands on deck
- **RTO**: 30 minutes | **RPO**: 5 minutes

### SEV2 - High (< 30 min response)

- **Definition**: Major functionality impaired, significant user impact
- **Examples**: High error rates, DQP critical freshness, worker failures
- **Response**: On-call engineer immediate response
- **RTO**: 2 hours | **RPO**: 15 minutes

### SEV3 - Medium (< 2 hours response)

- **Definition**: Partial functionality affected, workarounds available
- **Examples**: Report generation delays, non-critical feature issues
- **Response**: Business hours response, escalate if prolonged
- **RTO**: 8 hours | **RPO**: 1 hour

### SEV4 - Low (< 24 hours response)

- **Definition**: Minor issues, cosmetic problems, non-urgent improvements
- **Examples**: UI inconsistencies, performance degradation
- **Response**: Next business day, planned maintenance window
- **RTO**: 72 hours | **RPO**: 24 hours

## 👥 On-Call Rotation

### Primary On-Call Engineer

- **Responsibilities**: First response to SEV1-SEV2 alerts
- **Tools**: PagerDuty, Slack #adaf-alerts, dashboard access
- **Escalation**: If issue persists > 30 minutes or requires specialized knowledge>

### Secondary On-Call (Backup)

- **Responsibilities**: Support primary, take over if unavailable
- **Coverage**: Weekends, holidays, vacation coverage

### Escalation Contacts

- **Infrastructure Lead**: @infra-lead (Slack) | +1-xxx-xxx-1001 (SMS)
- **DQP Team Lead**: @dqp-lead (Slack) | +1-xxx-xxx-1002 (SMS)
- **Security Lead**: @sec-lead (Slack) | +1-xxx-xxx-1003 (SMS)
- **Engineering Manager**: @eng-manager (Slack) | +1-xxx-xxx-1000 (Emergency)

## 📊 SLOs & Monitoring

### Service Level Objectives

- **API Availability**: 99.9% uptime (< 43 minutes downtime/month)
- **API Latency**: p95 < 500ms, p99 < 2s
- **Error Rate**: < 0.1% for 5xx errors
- **Data Freshness**: Critical sources < 2 hours, standard < 4 hours

### Key Dashboards

- **Operations Overview**: [Grafana Dashboard](http://grafana:3000/d/ops-overview)
- **API Performance**: [Grafana Dashboard](http://grafana:3000/d/api-performance)
- **Data Quality**: [Grafana Dashboard](http://grafana:3000/d/dqp-overview)
- **Security Monitoring**: [Grafana Dashboard](http://grafana:3000/d/security-overview)

### Alert Sources

- **Prometheus**: <http://prometheus:9090/alerts>>
- **Grafana Alerts**: <http://grafana:3000/alerting>>
- **Application Logs**: CloudWatch/ELK Stack
- **Health Endpoints**: `/api/healthz`, `/api/system/validate`

## 🔧 Common Tools & Commands

### Health Checks

```bash

# Overall system health

curl -s <http://localhost:3000/api/healthz> | jq>

# Detailed validation

curl -s <http://localhost:3000/api/system/validate> | jq>

# Metrics snapshot

curl -s <http://localhost:3000/api/metrics>>

```

### Log Analysis

```bash

# API error analysis

grep "5xx" /var/log/adaf/api.log | tail -50

# Worker status

grep "worker" /var/log/adaf/workers.log | tail -20

# DQP issues

grep "DQP\|freshness" /var/log/adaf/dqp.log | tail -30

```

### Database Queries

```sql

-- Recent alerts
SELECT * FROM alerts WHERE createdAt > NOW() - INTERVAL '1 hour' ORDER BY createdAt DESC;>

-- Worker status
SELECT agentCode, COUNT(*) as signal_count, MAX(ts) as last_signal 
FROM signals WHERE ts > NOW() - INTERVAL '30 minutes' GROUP BY agentCode;>

-- System metrics
SELECT key, value, ts FROM metrics WHERE key LIKE 'system_%' AND ts > NOW() - INTERVAL '15 minutes';>

```

## 📝 Incident Response Workflow

### 1. Alert Reception

- [ ] Acknowledge alert within SLA time
- [ ] Assess severity and impact scope
- [ ] Open incident channel: `#incident-YYYYMMDD-HHMM`

### 2. Initial Response

- [ ] Follow specific runbook procedures
- [ ] Gather initial data and logs
- [ ] Implement immediate mitigation if available

### 3. Investigation

- [ ] Identify root cause using systematic approach
- [ ] Document findings in incident channel
- [ ] Engage SMEs if specialized knowledge required

### 4. Resolution

- [ ] Apply permanent fix or implement workaround
- [ ] Verify system stability and metric recovery
- [ ] Communicate status to stakeholders

### 5. Closure

- [ ] Update `change_logs` table: `entity='Ops', action='INCIDENT_RESOLVED'`
- [ ] Schedule post-mortem if incident > 15 minutes or SEV1-SEV2>
- [ ] Create follow-up tasks for preventive measures
- [ ] Update runbooks based on lessons learned

## 🔍 Runbook Maintenance

### Monthly Reviews

- Review and update escalation contacts
- Validate dashboard links and alert thresholds
- Test key procedures during maintenance windows
- Update SLO targets based on historical performance

### Quarterly Updates

- Conduct tabletop exercises for major incident scenarios
- Review post-mortem trends and systemic issues
- Update tooling and automation capabilities
- Training sessions for new team members

### Version Control

- All runbooks are version controlled in Git
- Changes require PR review by ops team
- Link updates automatically tested in CI/CD
- Deprecated procedures archived with timestamps

---

## 🆘 Emergency Contacts

### Immediate Response (24/7)

- **On-Call Phone**: +1-800-ADAF-OPS
- **Slack Emergency**: `@here` in `#adaf-critical`
- **PagerDuty**: ADAF Dashboard Service

### Business Hours Support

- **Operations Team**: `#adaf-ops-team`
- **Engineering**: `#adaf-engineering`
- **Product**: `#adaf-product`

### External Vendors

- **Cloud Provider**: AWS Support (Enterprise)
- **Monitoring**: DataDog Support
- **Security**: CrowdStrike SOC

---

**Last Updated**: September 30, 2025  
**Next Review**: October 30, 2025  
**Owner**: ADAF Operations Team
