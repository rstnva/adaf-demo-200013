# Runbook: OPX_BLOCKING_GUARDRAILS

**Severity**: SEV1/SEV2 (Variable)  
**Category**: Operational Safeguards  
**Owner**: Platform Team  
**On-Call**: Primary: @platform-team, Secondary: @engineering-lead  
**Last Updated**: 2025-01-09

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Name** | `OPXBlockingGuardrails` |
| **Threshold** | Critical operational guardrail triggered |
| **Impact** | System operations blocked, potential data loss prevention |
| **RTO** | 15 minutes (SEV1), 30 minutes (SEV2) |
| **RPO** | N/A (Protective measure) |

## Quick Actions

```bash
# Check active guardrail blocks
curl -s http://localhost:3000/api/opx/guardrails/active | \
  jq '.active_blocks[] | {id: .block_id, type: .guardrail_type, severity: .severity, reason: .trigger_reason}'

# Get guardrail system status
curl -s http://localhost:3000/api/opx/guardrails/status | jq '.'

# View recent guardrail events
curl -s "http://localhost:3000/api/opx/guardrails/events?since=30m&limit=10" | \
  jq '.events[] | {timestamp: .timestamp, type: .type, action: .action_taken, impact: .impact_level}'

# Emergency: Disable specific guardrail (use with extreme caution)
# curl -X POST "http://localhost:3000/api/opx/guardrails/disable" -H "Content-Type: application/json" -d '{"guardrail_id": "GUARDRAIL_ID", "reason": "emergency_override", "duration_minutes": 15}'
```

## Alert Description

Operational Guardrails are critical safety mechanisms that prevent potentially harmful operations from executing. When triggered, they block actions that could:

- Cause data loss or corruption
- Disrupt financial operations during market hours  
- Exceed risk management thresholds
- Violate compliance requirements
- Overwhelm system resources

This alert indicates a guardrail has been activated and requires immediate assessment.

## Guardrail Types

### 1. Financial Risk Guardrails (SEV1)
- **Portfolio exposure limits** - Prevent excessive position concentration
- **Trading volume thresholds** - Block unusual trading activity
- **Market hours restrictions** - Prevent off-hours automated trading
- **Liquidity constraints** - Ensure adequate cash reserves

### 2. Data Protection Guardrails (SEV1)
- **Mass data deletion prevention** - Block operations affecting >1000 records>
- **Production data export restrictions** - Prevent PII/sensitive data leaks
- **Schema change blocks** - Prevent destructive database modifications
- **Backup integrity checks** - Block operations if backups are stale

### 3. System Resource Guardrails (SEV2)
- **CPU/Memory thresholds** - Prevent resource exhaustion
- **Database connection limits** - Prevent connection pool exhaustion  
- **API rate limiting** - Protect against DoS conditions
- **Storage capacity restrictions** - Prevent disk space exhaustion

### 4. Compliance Guardrails (SEV1/SEV2)
- **Audit trail requirements** - Ensure all operations are logged
- **Access control verification** - Verify permissions before sensitive operations
- **Regulatory reporting blocks** - Prevent modifications during reporting periods
- **Data retention enforcement** - Block premature data purging

## Diagnostics

### 1. Identify Active Blocks

```bash
# Get comprehensive guardrail status
curl -s http://localhost:3000/api/opx/guardrails/comprehensive-status | jq '{
  total_active_blocks: .summary.active_blocks_count,
  severity_breakdown: .summary.severity_distribution,
  types_affected: .summary.guardrail_types_active,
  system_impact: .summary.operational_impact_level
}'

# Examine specific active blocks
curl -s http://localhost:3000/api/opx/guardrails/active | \
  jq '.active_blocks[] | {
    id: .block_id,
    type: .guardrail_type,
    triggered_at: .triggered_at,
    trigger_condition: .trigger_condition,
    blocked_operations: .blocked_operations_count,
    impact_assessment: .business_impact
  }'
```

### 2. Analyze Trigger Conditions

```bash
# Get detailed trigger analysis
ACTIVE_BLOCK=$(curl -s http://localhost:3000/api/opx/guardrails/active | jq -r '.active_blocks[0].block_id' 2>/dev/null)>

if [ -n "$ACTIVE_BLOCK" ]; then
    echo "Analyzing trigger: $ACTIVE_BLOCK"
    
    curl -s "http://localhost:3000/api/opx/guardrails/blocks/$ACTIVE_BLOCK/details" | jq '{
      trigger_metrics: .trigger_analysis.metrics_at_trigger,
      threshold_values: .trigger_analysis.configured_thresholds,
      contributing_factors: .trigger_analysis.contributing_factors,
      similar_incidents: .trigger_analysis.historical_patterns
    }'
fi
```

### 3. System State Assessment

```bash
# Check system metrics at time of trigger
curl -s "http://localhost:3000/api/opx/guardrails/system-state" | jq '{
  cpu_utilization: .system_metrics.cpu_percent,
  memory_usage: .system_metrics.memory_percent,
  database_connections: .system_metrics.db_connections_used,
  api_request_rate: .system_metrics.api_requests_per_second,
  active_trading_sessions: .business_metrics.active_trading_sessions
}'

# Financial metrics check (for financial guardrails)
curl -s "http://localhost:3000/api/opx/guardrails/financial-state" | jq '{
  portfolio_exposure: .risk_metrics.total_exposure_usd,
  daily_pnl: .risk_metrics.daily_pnl_usd,
  var_utilization: .risk_metrics.var_utilization_percent,
  liquidity_ratio: .risk_metrics.liquidity_ratio
}'
```

### 4. Operation Impact Analysis

```bash
# Check blocked operations
curl -s "http://localhost:3000/api/opx/guardrails/blocked-operations" | \
  jq '.blocked_operations[] | {
    operation_type: .operation_type,
    user_id: .initiated_by,
    attempted_at: .attempted_at,
    risk_score: .calculated_risk_score,
    business_justification: .user_provided_reason
  }'

# Check operation queue backup
curl -s "http://localhost:3000/api/opx/operations/queue-status" | jq '{
  pending_operations: .queue_depth,
  operations_on_hold: .blocked_count,
  estimated_delay_minutes: .estimated_processing_delay
}'
```

## Immediate Assessment

### Determine Legitimacy

```bash
# Check if guardrail trigger is legitimate
echo "=== GUARDRAIL LEGITIMACY CHECK ==="

# 1. Market conditions check
MARKET_HOURS=$(curl -s "http://localhost:3000/api/market/status" | jq -r '.status')
echo "Market Status: $MARKET_HOURS"

# 2. Recent system changes
echo "Recent deployments:"
curl -s "http://localhost:3000/api/admin/deployments/recent?limit=5" | \
  jq '.deployments[] | select(.deployed_at > (now - 3600)) | {component: .component, deployed_at: .deployed_at}'>

# 3. User activity patterns
echo "Unusual user activity:"
curl -s "http://localhost:3000/api/opx/guardrails/user-analysis" | \
  jq '.unusual_patterns[] | {user: .user_id, pattern: .anomaly_type, confidence: .confidence_score}'
```

### Risk Assessment

```bash
# Calculate risk of guardrail override
curl -s "http://localhost:3000/api/opx/guardrails/override-risk-assessment" | jq '{
  override_risk_score: .risk_assessment.override_risk_score,
  potential_financial_impact: .risk_assessment.max_financial_impact_usd,
  regulatory_implications: .risk_assessment.compliance_risk_level,
  recommended_action: .risk_assessment.recommendation,
  safe_override_conditions: .risk_assessment.safe_override_requirements
}'
```

## Mitigation Strategies

### For Financial Risk Guardrails

```bash
# If portfolio exposure guardrail triggered
curl -s "http://localhost:3000/api/opx/guardrails/financial/exposure-analysis" | jq '{
  current_exposure: .portfolio.total_exposure_usd,
  limit: .portfolio.exposure_limit_usd,
  largest_positions: .portfolio.top_positions[0:5],
  suggested_actions: .recommendations.immediate_actions
}'

# Temporary exposure adjustment (if approved by risk management)
# curl -X POST "http://localhost:3000/api/risk/temporary-limit-adjustment" \
#   -H "Content-Type: application/json" \
#   -d '{"adjustment_type": "exposure_limit", "new_limit_usd": 150000000, "duration_hours": 2, "approval_code": "RISK_MGR_APPROVAL"}'
```

### For Data Protection Guardrails

```bash
# If mass data operation blocked
BLOCKED_OP=$(curl -s "http://localhost:3000/api/opx/guardrails/blocked-operations?type=data_modification" | jq -r '.blocked_operations[0].operation_id')

if [ -n "$BLOCKED_OP" ]; then
    echo "Analyzing blocked data operation: $BLOCKED_OP"
    
    # Get operation details
    curl -s "http://localhost:3000/api/admin/operations/$BLOCKED_OP" | jq '{
      operation_type: .type,
      affected_tables: .target_tables,
      estimated_records: .estimated_affected_records,
      initiating_user: .user_info,
      business_justification: .justification
    }'
    
    # Alternative: Process in smaller batches if legitimate
    echo "Consider breaking operation into smaller batches (<1000 records each)"
fi
```

### For System Resource Guardrails

```bash
# If resource threshold guardrail triggered
echo "=== RESOURCE MITIGATION ==="

# Check top resource consumers
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10

# Database connection analysis
psql -h localhost -U adaf_user -d adaf_prod -c \
  "SELECT application_name, state, count(*) FROM pg_stat_activity GROUP BY application_name, state ORDER BY count DESC;"

# Consider scaling up resources temporarily
# kubectl scale deployment adaf-api --replicas=6  # Example for K8s
# Or alert infrastructure team for manual scaling
```

## Override Procedures

### Emergency Override (Use with Extreme Caution)

```bash
# ONLY use in true emergencies with proper approval
# Document all override decisions thoroughly

echo "=== EMERGENCY OVERRIDE PROCEDURE ==="
echo "1. Obtain approval from:"
echo "   - Engineering Lead (for system guardrails)"  
echo "   - Risk Manager (for financial guardrails)"
echo "   - Compliance Officer (for regulatory guardrails)"
echo "2. Document business justification"
echo "3. Set minimum necessary duration"
echo "4. Enable enhanced monitoring"

# Example override command (fill in actual values):
# curl -X POST "http://localhost:3000/api/opx/guardrails/emergency-override" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "guardrail_id": "SPECIFIC_GUARDRAIL_ID",
#     "override_reason": "DETAILED_BUSINESS_JUSTIFICATION", 
#     "approver_id": "APPROVER_EMAIL",
#     "duration_minutes": 15,
#     "enhanced_monitoring": true,
#     "emergency_contact": "ONCALL_PHONE"
#   }'
```

### Controlled Bypass for Legitimate Operations

```bash
# For pre-approved legitimate operations
curl -X POST "http://localhost:3000/api/opx/guardrails/controlled-bypass" \
  -H "Content-Type: application/json" \
  -d '{
    "operation_id": "SPECIFIC_OPERATION_ID",
    "bypass_type": "single_operation", 
    "approval_reference": "TICKET_OR_APPROVAL_NUMBER",
    "risk_acknowledgment": true,
    "monitoring_level": "enhanced"
  }'

# Verify bypass was applied correctly
sleep 5
curl -s "http://localhost:3000/api/opx/guardrails/bypass-status" | \
  jq '.active_bypasses[] | {operation: .operation_id, status: .bypass_status, expires_at: .expires_at}'
```

## Recovery Actions

### Post-Override Monitoring

```bash
# Enable enhanced monitoring during override period
curl -X POST "http://localhost:3000/api/monitoring/enhanced-mode" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "guardrail_override",
    "metrics": ["all_financial", "all_system", "user_activity"],
    "alert_thresholds": "conservative",
    "notification_channels": ["slack_security", "email_leadership"]
  }'

# Set up automatic re-engagement
curl -X POST "http://localhost:3000/api/opx/guardrails/auto-reengagement" \
  -H "Content-Type: application/json" \
  -d '{
    "guardrail_id": "OVERRIDDEN_GUARDRAIL_ID",
    "reengagement_conditions": ["time_elapsed", "metric_normalization"],
    "safety_checks": ["system_stable", "no_anomalies"]
  }'
```

### Validation and Cleanup

```bash
# Validate system state after override
echo "=== POST-OVERRIDE VALIDATION ==="

# Check for any adverse effects
curl -s "http://localhost:3000/api/opx/guardrails/impact-assessment" | jq '{
  system_stability: .assessment.system_stability_score,
  financial_impact: .assessment.financial_metrics_deviation,
  compliance_status: .assessment.compliance_check_results,
  anomaly_detection: .assessment.detected_anomalies
}'

# Verify operation completion
curl -s "http://localhost:3000/api/opx/operations/completion-status" | \
  jq '.recent_completions[] | select(.completed_during_override == true) | {
    operation: .operation_id,
    success: .completion_status,
    impact: .measured_impact
  }'
```

## Escalation Criteria

**Immediate escalation to Engineering Lead** if:
- Multiple SEV1 guardrails triggered simultaneously
- System stability compromised after guardrail override
- Financial exposure exceeding regulatory limits
- Compliance violations detected

**Escalate to Risk Management** if:
- Financial guardrails blocking critical trading operations
- Risk limits being approached or exceeded
- Market conditions creating unusual risk scenarios
- Regulatory reporting periods affected

**Escalate to Executive Team** if:
- Business operations significantly impacted for >30 minutes>
- Financial losses exceeding $100K due to guardrail issues
- Regulatory violations with potential penalties
- Customer-facing services affected

## Post-Incident Actions

1. **Guardrail Effectiveness Review**:
   ```bash
   # Analyze guardrail performance during incident
   curl -s "http://localhost:3000/api/opx/guardrails/effectiveness-analysis" \
     -H "Content-Type: application/json" \
     -d '{"incident_id": "INCIDENT_ID", "analysis_period": "24h"}'
   ```

2. **Threshold Tuning**:
   - Review trigger thresholds based on incident patterns
   - Adjust sensitivity to reduce false positives
   - Update business logic for legitimate exception handling

3. **Process Improvements**:
   - Document override procedures and approval workflows
   - Update emergency contact procedures
   - Implement automated escalation for specific scenarios

4. **Training and Awareness**:
   - Update team training on guardrail systems
   - Create decision trees for override scenarios
   - Establish clearer approval authorities

## Related Runbooks

- [ALERT_API_5XX](./ALERT_API_5XX.md) - For API-related operational issues
- [SECURITY_CSP_VIOLATIONS](./SECURITY_CSP_VIOLATIONS.md) - For security-related blocks
- [ALERT_WORKER_LAG](./ALERT_WORKER_LAG.md) - For performance-related guardrails

## Dashboard Links

- [Guardrails Overview Dashboard](http://grafana.adaf.local/d/guardrails/opx-guardrails-overview)
- [Risk Management Dashboard](http://grafana.adaf.local/d/risk/risk-management)
- [System Protection Dashboard](http://grafana.adaf.local/d/protection/system-protection)

## Health Check

Guardrails Status: `http://localhost:3000/api/opx/guardrails/health`  
System Protection: `http://localhost:3000/api/opx/protection/status`
