# Runbook: SECURITY_CSP_VIOLATIONS

**Severity**: SEV2  
**Category**: Security Incident  
**Owner**: Security Team  
**On-Call**: Primary: @security-team, Secondary: @platform-team  
**Last Updated**: 2025-01-09

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Name** | `SecurityCSPViolations` |
| **Threshold** | >10 CSP violations in 5 minutes OR Critical CSP directive violated |>
| **Impact** | Potential XSS/injection attacks, data breach risk |
| **RTO** | 15 minutes (SEV2) |
| **RPO** | N/A (Security incident) |

## Quick Actions

```bash
# Check recent CSP violations
curl -s "http://localhost:3000/api/security/csp/violations?since=5m" | jq '.violations | length'

# Get violation details
curl -s "http://localhost:3000/api/security/csp/violations?limit=20" | \
  jq '.violations[] | {time: .timestamp, directive: .directive, blocked_uri: .blocked_uri, source: .source_file}'

# Check WAF logs for suspicious activity
tail -f /var/log/nginx/security.log | grep -E "(CSP|XSS|inject)"

# Temporary: Tighten CSP policy (if attack in progress)
# sed -i.bak 's/unsafe-inline//g' /etc/nginx/conf.d/csp.conf && nginx -t && systemctl reload nginx
```

## Alert Description

This alert triggers when Content Security Policy (CSP) violations exceed normal thresholds or when critical security directives are violated. CSP violations can indicate attempted XSS attacks, compromised assets, or misconfigurations that weaken security posture.

CSP violations are reported by browsers when content doesn't comply with the defined Content Security Policy headers.

## Common Causes

1. **Cross-Site Scripting (XSS) attacks** - Malicious scripts injection attempts
2. **Compromised third-party resources** - CDN or external assets serving malicious content
3. **Browser extensions** - User browser extensions injecting content
4. **Misconfigured CSP headers** - Too permissive or incorrect policy directives  
5. **Development artifacts** - Debug scripts or dev tools left in production
6. **Outdated cached resources** - Old JS/CSS files with deprecated patterns

## Diagnostics

### 1. Analyze Violation Patterns

```bash
# Get violation summary by directive
curl -s "http://localhost:3000/api/security/csp/violations?since=1h" | \
  jq '.violations | group_by(.directive) | map({directive: .[0].directive, count: length}) | sort_by(-.count)'

# Get violation summary by blocked URI
curl -s "http://localhost:3000/api/security/csp/violations?since=1h" | \
  jq '.violations | group_by(.blocked_uri) | map({uri: .[0].blocked_uri, count: length}) | sort_by(-.count) | .[0:10]'

# Get violation summary by source IP
curl -s "http://localhost:3000/api/security/csp/violations?since=1h" | \
  jq '.violations | group_by(.source_ip) | map({ip: .[0].source_ip, count: length}) | sort_by(-.count) | .[0:10]'
```

### 2. Check CSP Policy Configuration

```bash
# Current CSP policy
curl -I http://localhost:3000/ | grep -i "content-security-policy"

# Nginx CSP configuration
grep -r "add_header.*Content-Security-Policy" /etc/nginx/conf.d/

# Check for policy changes
git log --oneline -10 config/nginx/ config/security/
```

### 3. Examine Violation Details

```bash
# Get recent high-severity violations
curl -s "http://localhost:3000/api/security/csp/violations?severity=high&since=1h" | \
  jq '.violations[] | {
    time: .timestamp,
    directive: .directive,  
    blocked_uri: .blocked_uri,
    source_file: .source_file,
    user_agent: .user_agent,
    referrer: .referrer
  }'

# Check for script-src violations (high risk)
curl -s "http://localhost:3000/api/security/csp/violations?directive=script-src&since=1h" | \
  jq '.violations[] | {
    blocked_uri: .blocked_uri,
    source_file: .source_file,
    line_number: .line_number,
    column_number: .column_number
  }'
```

### 4. Security Context Analysis

```bash
# Check for concurrent security events
curl -s "http://localhost:3000/api/security/events?since=1h&types=xss,injection,suspicious" | \
  jq '.events[] | {type: .type, source_ip: .source_ip, timestamp: .timestamp}'

# WAF and firewall logs correlation  
tail -n 100 /var/log/nginx/security.log | grep -E "$(date '+%d/%b/%Y:%H:[0-9][0-9]')" | \
  grep -E "(BLOCK|DENY|SUSPICIOUS)"

# Check authentication logs for suspicious activity
grep "$(date '+%b %d %H:')" /var/log/auth.log | grep -E "(Failed|Invalid|Refused)"
```

### 5. Asset Integrity Check

```bash
# Verify CDN resources haven't been compromised
curl -s "http://localhost:3000/api/security/assets/integrity" | jq '.'

# Check for unexpected external domains
curl -s "http://localhost:3000/api/security/csp/violations?since=1h" | \
  jq -r '.violations[].blocked_uri' | grep -E "^https?://" | cut -d/ -f3 | sort -u

# Verify known good resources
curl -I https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
curl -I https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css
```

## Immediate Mitigation

### For Active Attack (XSS/Injection)

```bash
# If script-src violations suggest active XSS attack
ATTACK_IPS=$(curl -s "http://localhost:3000/api/security/csp/violations?directive=script-src&since=10m" | \
  jq -r '.violations[].source_ip' | sort -u)

if [ -n "$ATTACK_IPS" ]; then
    echo "Potential XSS attack from IPs: $ATTACK_IPS"
    
    # Block suspicious IPs temporarily (adjust firewall rules as needed)
    for ip in $ATTACK_IPS; do
        # Example with iptables (adjust to your firewall)
        echo "Consider blocking IP: $ip"
        # sudo iptables -A INPUT -s $ip -j DROP
    done
    
    # Notify security team immediately
    curl -X POST "$SLACK_WEBHOOK_SECURITY" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"🚨 SECURITY ALERT: Potential XSS attack detected from IPs: $ATTACK_IPS\"}"
fi
```

### For Compromised External Resources

```bash
# If violations suggest compromised CDN/external resource
SUSPICIOUS_DOMAINS=$(curl -s "http://localhost:3000/api/security/csp/violations?since=10m" | \
  jq -r '.violations[].blocked_uri' | grep -E "^https?://" | cut -d/ -f3 | sort -u | head -5)

for domain in $SUSPICIOUS_DOMAINS; do
    echo "Checking domain: $domain"
    
    # Quick reputation check (adjust to your tools)
    # dig +short $domain
    # whois $domain | grep -E "(Creation|Updated) Date"
    
    # Consider temporarily blocking in CSP
    echo "Consider adding to CSP blocklist: $domain"
done
```

### For CSP Policy Issues

```bash
# If misconfiguration detected, backup current policy
cp /etc/nginx/conf.d/csp.conf /etc/nginx/conf.d/csp.conf.backup.$(date +%s)

# Apply more restrictive policy temporarily
cat > /tmp/strict_csp.conf << 'EOF'
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://api.adaf.local;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
" always;
EOF

# Test configuration before applying
nginx -t -c /tmp/strict_csp.conf
if [ $? -eq 0 ]; then
    echo "Strict CSP policy tested successfully - consider applying"
else
    echo "ERROR: Strict CSP policy has syntax errors"
fi
```

## Investigation

### Forensic Analysis

```bash
# Detailed violation forensics
curl -s "http://localhost:3000/api/security/csp/violations?since=6h&detailed=true" | \
  jq '.violations[] | select(.directive == "script-src") | {
    timestamp: .timestamp,
    blocked_content: .blocked_uri,
    source_location: "\(.source_file):\(.line_number):\(.column_number)",
    user_agent: .user_agent,
    referrer: .referrer,
    sample: .violated_directive_sample
  }'

# Check application logs for correlation
grep -E "$(date '+%Y-%m-%d %H:[0-9][0-9]')" /var/log/adaf/application.log | \
  grep -i -E "(error|exception|inject|script|xss)"
```

### Attack Pattern Analysis

```bash
# Time-series analysis of violations
curl -s "http://localhost:3000/api/security/csp/analytics/timeline?since=24h&interval=1h" | \
  jq '.timeline[] | {hour: .timestamp, violations: .count, severity_breakdown: .severity_counts}'

# User session correlation
curl -s "http://localhost:3000/api/security/csp/violations?since=2h" | \
  jq '.violations | group_by(.session_id) | map({
    session: .[0].session_id, 
    violation_count: length, 
    user_agent: .[0].user_agent,
    first_seen: (sort_by(.timestamp) | .[0].timestamp),
    last_seen: (sort_by(.timestamp) | .[-1].timestamp)
  }) | sort_by(-.violation_count)'
```

### Code Review for XSS Vulnerabilities

```bash
# Check recent code changes for XSS risks
git log --since="24 hours ago" --grep="innerHTML\|eval\|document\.write" --oneline

# Search for potentially dangerous patterns
grep -r -n "innerHTML\|outerHTML\|insertAdjacentHTML" src/ --include="*.js" --include="*.ts"
grep -r -n "eval\|Function\|setTimeout.*string" src/ --include="*.js" --include="*.ts"
grep -r -n "document\.write\|document\.writeln" src/ --include="*.js" --include="*.ts"
```

## Recovery Actions

### Immediate Response

```bash
# Enable enhanced CSP reporting
curl -X POST "http://localhost:3000/api/security/csp/reporting/enable" \
  -H "Content-Type: application/json" \
  -d '{"level": "verbose", "sample_rate": 1.0}'

# Deploy stricter CSP policy if attack confirmed
if [[ "$CONFIRMED_ATTACK" == "true" ]]; then
    # Backup current policy
    cp /etc/nginx/conf.d/csp.conf /etc/nginx/conf.d/csp.conf.incident.$(date +%s)
    
    # Apply emergency CSP policy
    curl -X POST "http://localhost:3000/api/security/csp/policy/emergency" \
      -H "Content-Type: application/json" \
      -d '{"mode": "strict", "duration": "1h"}'
fi
```

### User Session Management

```bash
# If user sessions compromised, invalidate active sessions
if [[ "$SESSION_COMPROMISE" == "true" ]]; then
    echo "Invalidating potentially compromised user sessions"
    
    # Get sessions with CSP violations
    COMPROMISED_SESSIONS=$(curl -s "http://localhost:3000/api/security/csp/violations?since=1h" | \
      jq -r '.violations[].session_id' | sort -u)
    
    for session in $COMPROMISED_SESSIONS; do
        curl -X DELETE "http://localhost:3000/api/auth/sessions/$session"
        echo "Invalidated session: $session"
    done
fi
```

### Asset Verification and Cleanup

```bash
# Re-verify all external assets integrity
curl -X POST "http://localhost:3000/api/security/assets/verify-all"

# Clear potentially compromised cached resources
curl -X POST "http://localhost:3000/api/cache/clear" \
  -H "Content-Type: application/json" \
  -d '{"patterns": ["*.js", "*.css"], "reason": "security_incident"}'

# Regenerate SRI hashes for all assets
npm run build:sri-hashes
```

## Escalation Criteria

**Immediate escalation to Security Team Lead** if:
- Evidence of active XSS or code injection attacks
- User data accessed or modified through violations
- Administrative interfaces compromised
- More than 100 violations from single IP in 1 minute

**Escalate to Incident Commander** if:
- Multiple users affected by security breach
- Customer data potentially compromised  
- Attack spreading to other systems/services
- Media or regulatory attention likely

**Escalate to Legal/Compliance** if:
- Personal data (PII/PHI) potentially accessed
- Regulatory reporting requirements triggered
- Customer notification may be required
- Evidence preservation needed for investigation

## Post-Incident Actions

1. **Forensic Data Collection**:
   ```bash
   # Export violation data for analysis
   curl -s "http://localhost:3000/api/security/csp/violations/export?since=24h" > csp_violations_$(date +%s).json>
   
   # Export related security events
   curl -s "http://localhost:3000/api/security/events/export?since=24h" > security_events_$(date +%s).json>
   ```

2. **Security Hardening**:
   - Review and update CSP policies based on violation patterns
   - Implement additional XSS protection measures
   - Update asset integrity checking mechanisms
   - Review code for XSS vulnerabilities

3. **Monitoring Enhancement**:
   - Adjust CSP violation alert thresholds
   - Add monitoring for new attack patterns discovered
   - Implement behavioral analysis for abnormal violation patterns
   - Set up correlation rules with other security events

4. **User Communication**:
   - Notify affected users if sessions were compromised
   - Provide security recommendations (update browsers, check for malware)
   - Document incident for transparency reports if required

## Related Runbooks

- [ALERT_API_5XX](./ALERT_API_5XX.md) - For API security issues
- [OPX_BLOCKING_GUARDRAILS](./OPX_BLOCKING_GUARDRAILS.md) - For operational security blocks

## Dashboard Links

- [Security Overview Dashboard](http://grafana.adaf.local/d/security/security-overview)
- [CSP Violations Dashboard](http://grafana.adaf.local/d/csp/csp-violations)
- [WAF Security Dashboard](http://grafana.adaf.local/d/waf/waf-security)

## Health Check

CSP Status: `http://localhost:3000/api/security/csp/status`  
Security Events: `http://localhost:3000/api/security/events/summary`
