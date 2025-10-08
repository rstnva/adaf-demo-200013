# Post-Mortem Report Template

**Incident ID**: `INCIDENT-YYYYMMDD-HHMM`  
**Date**: YYYY-MM-DD  
**Duration**: X hours Y minutes  
**Severity**: SEV1/SEV2/SEV3/SEV4  
**Status**: RESOLVED/UNDER INVESTIGATION  

## 📋 Executive Summary

**Brief description of what happened, customer impact, and resolution**

- What: [One-sentence description of the incident]
- When: [Start time] to [End time] ([Duration])
- Impact: [Customer-facing impact, affected users/services]
- Root Cause: [Brief technical explanation]
- Resolution: [How it was resolved]

## 🎯 Impact Assessment

### Service Level Impact

- **Availability**: X% uptime (SLO: 99.9%)
- **Error Rate**: X% (SLO: <0.1%)
- **Latency**: p95 = Xms, p99 = Xms (SLO: <500ms)
- **Data Freshness**: Max staleness = X minutes (SLO: <2 hours)

### Business Impact

- **Users Affected**: X users/customers
- **Revenue Impact**: $X (if applicable)
- **Feature Availability**: [List of features impacted]
- **SLA Breaches**: [Any contractual SLA violations]

### Geographic/Component Scope

- **Regions**: [Which regions/zones affected]
- **Services**: [Which microservices/components]
- **Data Sources**: [Which data providers/feeds]

## ⏰ Timeline

**All times in UTC. Use YYYY-MM-DD HH:MM format.**

### Detection and Response

| Time | Event | Actor | Action/Observation |
|------|-------|-------|-------------------|
| HH:MM | Initial trigger | System | Alert fired: [Alert Name] |
| HH:MM | Detection | On-call | Alert acknowledged |
| HH:MM | Initial assessment | Engineer | Confirmed impact scope |
| HH:MM | Incident declared | On-call | SEV-X incident opened |
| HH:MM | First mitigation | Engineer | [Describe action taken] |

### Investigation and Escalation

| Time | Event | Actor | Action/Observation |
|------|-------|-------|-------------------|
| HH:MM | Root cause hypothesis | Engineer | [Initial theory] |
| HH:MM | Escalation | On-call | Engaged [Team/SME] |
| HH:MM | Additional findings | Engineer | [New information discovered] |
| HH:MM | Escalation | Manager | [If needed] |

### Resolution and Recovery

| Time | Event | Actor | Action/Observation |
|------|-------|-------|-------------------|
| HH:MM | Solution implemented | Engineer | [Describe fix] |
| HH:MM | Monitoring | Team | Verified metrics recovery |
| HH:MM | Incident resolved | On-call | All systems nominal |
| HH:MM | Post-incident | Team | Customer communication sent |

## 🔍 Root Cause Analysis

### Primary Root Cause

**[Use 5 Whys methodology]**

1. **What happened?** [Immediate symptom]
   - Answer: [Direct cause]

2. **Why did that happen?** [First level]
   - Answer: [Contributing factor]

3. **Why did that occur?** [Second level]  
   - Answer: [Deeper cause]

4. **Why was that the case?** [Third level]
   - Answer: [System/process issue]

5. **Why did we have that condition?** [Root cause]
   - Answer: [Fundamental cause]

### Contributing Factors

- **Technical**: [Code bugs, configuration issues, infrastructure problems]
- **Process**: [Gaps in procedures, insufficient monitoring, poor documentation]
- **Human**: [Knowledge gaps, communication failures, decision delays]
- **External**: [Third-party failures, unexpected load, environmental factors]

### What Went Well

- **Detection**: [How quickly we detected the issue]
- **Response**: [Effective actions taken during incident]
- **Communication**: [Good coordination and updates]
- **Mitigation**: [Successful workarounds or fixes]

### What Could Be Improved

- **Prevention**: [How we could have prevented this]
- **Detection**: [Earlier warning signs we missed]
- **Response**: [Faster or more effective response]
- **Recovery**: [Quicker resolution methods]

## 🛠️ Corrective Actions

### Immediate Actions (Complete within 1 week)

| Action Item | Owner | Due Date | Status | Verification |
|-------------|-------|----------|--------|--------------|
| [Specific action] | @username | YYYY-MM-DD | ⏳ Open | [How to verify completion] |
| [Fix monitoring gap] | @username | YYYY-MM-DD | ⏳ Open | [Verification criteria] |
| [Update runbook] | @username | YYYY-MM-DD | ⏳ Open | [Link to updated doc] |

### Medium-term Actions (Complete within 1 month)

| Action Item | Owner | Due Date | Status | Verification |
|-------------|-------|----------|--------|--------------|
| [Process improvement] | @username | YYYY-MM-DD | ⏳ Open | [Success criteria] |
| [System enhancement] | @username | YYYY-MM-DD | ⏳ Open | [Testing plan] |
| [Training plan] | @username | YYYY-MM-DD | ⏳ Open | [Training completion] |

### Long-term Actions (Complete within 1 quarter)

| Action Item | Owner | Due Date | Status | Verification |
|-------------|-------|----------|--------|--------------|
| [Architecture change] | @team | YYYY-MM-DD | ⏳ Open | [Design review complete] |
| [Tool implementation] | @team | YYYY-MM-DD | ⏳ Open | [Tool deployed] |

## 📚 Lessons Learned

### Technical Lessons

- **Architecture**: [What we learned about system design]
- **Monitoring**: [Gaps or improvements in observability]
- **Deployment**: [Release or configuration management insights]
- **Dependencies**: [Third-party or internal service learnings]

### Process Lessons  

- **Incident Response**: [Response process improvements]
- **Communication**: [Internal and external communication lessons]
- **Escalation**: [When and how to escalate effectively]
- **Documentation**: [Runbook or knowledge gaps identified]

### Organizational Lessons

- **Training**: [Skill or knowledge gaps to address]
- **Tooling**: [Tool limitations or requirements]
- **Capacity**: [Resource or staffing considerations]
- **Culture**: [Team dynamics or decision-making insights]

## 📊 Metrics and Measurements

### Response Time Metrics

- **Time to Detect**: X minutes (from issue start to alert firing)
- **Time to Acknowledge**: X minutes (from alert to human response)  
- **Time to Mitigate**: X minutes (from acknowledgment to first mitigation)
- **Time to Resolve**: X hours Y minutes (total incident duration)

### SLO Impact Calculation

```
Availability Impact:
- Total downtime: X minutes
- Monthly SLO budget: 43 minutes (99.9%)
- SLO budget consumed: X% 
- Remaining budget: Y minutes

Error Rate Impact:
- Peak error rate: X%
- Duration above SLO: Y minutes
- Error budget consumed: Z%
```

### Follow-up Metrics (30 days post-incident)

- [ ] Similar incidents prevented: X
- [ ] Detection time improved by: X%
- [ ] Recovery time improved by: X%
- [ ] Action items completion rate: X%

## 🔗 Supporting Information

### Relevant Links

- **Incident Slack Channel**: #incident-YYYYMMDD-HHMM
- **Alert Dashboard**: [Grafana link]
- **Log Analysis**: [CloudWatch/ELK/Splunk link]  
- **Code Changes**: [GitHub PR links]
- **Configuration Changes**: [Change management tickets]

### Data and Evidence

- **Screenshots**: [Attach relevant dashboard screenshots]
- **Log Excerpts**: [Key log entries with timestamps]
- **Metrics Graphs**: [Before/during/after metric charts]
- **Code Snippets**: [Relevant code that caused or fixed issue]

### External Communication

- **Customer Updates**: [Links to status page updates or customer emails]
- **Stakeholder Reports**: [Executive summaries sent]
- **Public Communication**: [Blog posts or public statements]

## ✅ Sign-off and Approval

### Review and Approval

- **Author**: @username (Date: YYYY-MM-DD)
- **Technical Review**: @username (Date: YYYY-MM-DD)
- **Management Review**: @manager (Date: YYYY-MM-DD)
- **Final Approval**: @director (Date: YYYY-MM-DD)

### Distribution List

- [ ] Engineering Team
- [ ] Operations Team  
- [ ] Product Management
- [ ] Customer Success
- [ ] Executive Team (if SEV1-SEV2)

---

**Document Status**: DRAFT/UNDER REVIEW/APPROVED/ARCHIVED  
**Next Review Date**: YYYY-MM-DD (6 months from incident)  
**Version**: 1.0  
**Last Updated**: YYYY-MM-DD by @username
