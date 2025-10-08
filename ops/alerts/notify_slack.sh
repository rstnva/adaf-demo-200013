#!/bin/bash

# ================================================================================================
# Slack Alert Notification Script
# ================================================================================================
# Sends formatted alerts from Prometheus Alertmanager to Slack webhooks
# Supports different severity levels, rich formatting, and runbook links
# ================================================================================================

set -euo pipefail

# Configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
ALERT_SEVERITY="${ALERT_SEVERITY:-warning}"
ALERT_NAME="${ALERT_NAME:-Unknown Alert}"
ALERT_DESCRIPTION="${ALERT_DESCRIPTION:-No description provided}"
ALERT_INSTANCE="${ALERT_INSTANCE:-unknown}"
ALERT_COMPONENT="${ALERT_COMPONENT:-system}"
ALERT_VALUE="${ALERT_VALUE:-0}"
RUNBOOK_URL="${RUNBOOK_URL:-https://docs.adaf.com/runbooks/default}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3005}"

# Colors for different severity levels
declare -A SEVERITY_COLORS=(
    ["critical"]="#FF4444"
    ["warning"]="#FFA500"
    ["info"]="#36A2EB"
    ["resolved"]="#4CAF50"
)

# Emojis for different severity levels
declare -A SEVERITY_EMOJIS=(
    ["critical"]="🚨"
    ["warning"]="⚠️"
    ["info"]="ℹ️"
    ["resolved"]="✅"
)

# Component emojis
declare -A COMPONENT_EMOJIS=(
    ["api"]="🌐"
    ["worker"]="⚙️"
    ["database"]="💾"
    ["dqp"]="📊"
    ["research"]="🔬"
    ["reports"]="📋"
    ["opx"]="💰"
    ["security"]="🛡️"
    ["system"]="🖥️"
)

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

# Show help
show_help() {
    cat << EOF
ADAF Dashboard Slack Alert Notification Script

Usage: $0 [OPTIONS]

Options:
    --webhook-url URL       Slack webhook URL (required)
    --severity LEVEL        Alert severity: critical, warning, info, resolved (default: warning)
    --alert-name NAME       Name of the alert (required)
    --description TEXT      Alert description (required)
    --instance INSTANCE     Instance/host identifier
    --component COMPONENT   Component name (api, worker, database, etc.)
    --value VALUE          Alert metric value
    --runbook-url URL      Link to runbook documentation
    --dashboard-url URL    Link to ADAF dashboard
    -h, --help             Show this help message

Environment Variables:
    SLACK_WEBHOOK_URL      Slack webhook URL
    ALERT_SEVERITY         Default severity level
    DASHBOARD_URL          Base URL for ADAF dashboard
    RUNBOOK_URL            Base URL for runbook documentation

Examples:
    # Critical API error
    $0 --webhook-url "https://hooks.slack.com/..." \\
       --severity critical \\
       --alert-name "HighAPIErrorRate" \\
       --description "API error rate exceeded 5%" \\
       --component api \\
       --instance "prod-api-01" \\
       --value "7.2%"

    # Worker delay warning
    $0 --severity warning \\
       --alert-name "WorkerTickDelay" \\
       --description "Worker tick delayed by 150 seconds" \\
       --component worker \\
       --value "150s"

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --webhook-url)
                SLACK_WEBHOOK_URL="$2"
                shift 2
                ;;
            --severity)
                ALERT_SEVERITY="$2"
                shift 2
                ;;
            --alert-name)
                ALERT_NAME="$2"
                shift 2
                ;;
            --description)
                ALERT_DESCRIPTION="$2"
                shift 2
                ;;
            --instance)
                ALERT_INSTANCE="$2"
                shift 2
                ;;
            --component)
                ALERT_COMPONENT="$2"
                shift 2
                ;;
            --value)
                ALERT_VALUE="$2"
                shift 2
                ;;
            --runbook-url)
                RUNBOOK_URL="$2"
                shift 2
                ;;
            --dashboard-url)
                DASHBOARD_URL="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR: Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate required parameters
validate_params() {
    local errors=()
    
    if [[ -z "$SLACK_WEBHOOK_URL" ]]; then
        errors+=("Slack webhook URL is required (--webhook-url or SLACK_WEBHOOK_URL env var)")
    fi
    
    if [[ -z "$ALERT_NAME" ]] || [[ "$ALERT_NAME" == "Unknown Alert" ]]; then
        errors+=("Alert name is required (--alert-name)")
    fi
    
    if [[ -z "$ALERT_DESCRIPTION" ]] || [[ "$ALERT_DESCRIPTION" == "No description provided" ]]; then
        errors+=("Alert description is required (--description)")
    fi
    
    if [[ ! "${SEVERITY_COLORS[$ALERT_SEVERITY]:-}" ]]; then
        errors+=("Invalid severity level: $ALERT_SEVERITY (must be: critical, warning, info, resolved)")
    fi
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        log "ERROR: Validation failed:"
        printf '%s\n' "${errors[@]}" >&2
        echo >&2
        show_help
        exit 1
    fi
}

# Generate dynamic URLs based on alert context
generate_runbook_url() {
    local alert_name="${ALERT_NAME,,}"
    local base_url="https://github.com/your-org/adaf-dashboard-pro/blob/main/docs/runbooks/"
    
    case "$alert_name" in
        *"api"*"5xx"*|*"error"*"rate"*|*"high"*"api"*)
            echo "${base_url}ALERT_API_5XX.md"
            ;;
        *"dqp"*"freshness"*|*"data"*"fresh"*|*"staleness"*)
            echo "${base_url}ALERT_DQP_FRESHNESS.md"
            ;;
        *"worker"*"lag"*|*"worker"*"delay"*|*"tick"*"delay"*)
            echo "${base_url}ALERT_WORKER_LAG.md"
            ;;
        *"report"*"scheduler"*|*"report"*"fail"*|*"generation"*)
            echo "${base_url}ALERT_REPORT_SCHEDULER.md"
            ;;
        *"csp"*"violation"*|*"security"*|*"content"*"policy"*)
            echo "${base_url}SECURITY_CSP_VIOLATIONS.md"
            ;;
        *"backtest"*"fail"*|*"research"*|*"strategy"*)
            echo "${base_url}RESEARCH_BACKTEST_FAIL.md"
            ;;
        *"opx"*"blocking"*|*"guardrail"*|*"opportunity"*)
            echo "${base_url}OPX_BLOCKING_GUARDRAILS.md"
            ;;
        *)
            echo "${base_url}README.md"
            ;;
    esac
}

generate_dashboard_url() {
    local component="${ALERT_COMPONENT,,}"
    local base_url="http://grafana:3000/d/"
    
    case "$component" in
        "api"|"web"|"frontend")
            echo "${base_url}api-performance"
            ;;
        "dqp"|"data"|"quality")
            echo "${base_url}dqp-overview"
            ;;
        "worker"|"agent"|"processing")
            echo "${base_url}ops-overview"
            ;;
        "security"|"auth"|"csp")
            echo "${base_url}security-overview"
            ;;
        "database"|"db"|"storage")
            echo "${base_url}database-performance"
            ;;
        "research"|"backtest"|"strategy")
            echo "${base_url}research-overview"
            ;;
        *)
            echo "${base_url}ops-overview"
            ;;
    esac
}

# Generate Slack message payload
generate_slack_payload() {
    local color="${SEVERITY_COLORS[$ALERT_SEVERITY]}"
    local severity_emoji="${SEVERITY_EMOJIS[$ALERT_SEVERITY]}"
    local component_emoji="${COMPONENT_EMOJIS[$ALERT_COMPONENT]:-🔧}"
    local timestamp=$(date +%s)
    
    # Generate dynamic URLs if not provided
    local dynamic_runbook_url=$(generate_runbook_url)
    local dynamic_dashboard_url=$(generate_dashboard_url)
    local final_runbook_url="${RUNBOOK_URL:-$dynamic_runbook_url}"
    local final_dashboard_url="${DASHBOARD_URL:-$dynamic_dashboard_url}"
    
    # Format title based on severity
    local title_prefix
    case "$ALERT_SEVERITY" in
        "critical")
            title_prefix="🚨 CRITICAL ALERT"
            ;;
        "warning")
            title_prefix="⚠️  WARNING"
            ;;
        "info")
            title_prefix="ℹ️  INFO"
            ;;
        "resolved")
            title_prefix="✅ RESOLVED"
            ;;
    esac
    
    # Build the JSON payload
    cat << EOF
{
    "username": "ADAF Dashboard Alerts",
    "icon_emoji": ":warning:",
    "attachments": [
        {
            "color": "$color",
            "fallback": "$title_prefix: $ALERT_NAME - $ALERT_DESCRIPTION",
            "title": "$title_prefix: $ALERT_NAME",
            "title_link": "$final_dashboard_url",
            "text": "$ALERT_DESCRIPTION",
            "fields": [
                {
                    "title": "Component",
                    "value": "$component_emoji $ALERT_COMPONENT",
                    "short": true
                },
                {
                    "title": "Instance",
                    "value": "$ALERT_INSTANCE",
                    "short": true
                },
                {
                    "title": "Value",
                    "value": "$ALERT_VALUE",
                    "short": true
                },
                {
                    "title": "Severity",
                    "value": "$severity_emoji $ALERT_SEVERITY",
                    "short": true
                }
            ],
            "actions": [
                {
                    "type": "button",
                    "text": "📖 Runbook",
                    "url": "$final_runbook_url"
                },
                {
                    "type": "button",
                    "text": "📊 Dashboard",
                    "url": "$final_dashboard_url"
                },
                {
                    "type": "button",
                    "text": "⚙️ Control Panel",
                    "url": "http://localhost:3000/control"
                }
            ],
            "footer": "ADAF Dashboard",
            "footer_icon": "https://adaf.com/favicon.ico",
            "ts": $timestamp
        }
    ]
}
EOF
}

# Send notification to Slack
send_slack_notification() {
    local payload
    payload=$(generate_slack_payload)
    
    log "INFO: Sending alert notification to Slack..."
    log "INFO: Alert: $ALERT_NAME (severity: $ALERT_SEVERITY)"
    log "INFO: Component: $ALERT_COMPONENT, Instance: $ALERT_INSTANCE"
    
    local response
    local http_status
    
    # Send the webhook request
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        --connect-timeout 10 \
        --max-time 30 \
        "$SLACK_WEBHOOK_URL") || {
        log "ERROR: Failed to send Slack notification (curl error)"
        return 1
    }
    
    # Parse response
    http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [[ "$http_status" -eq 200 ]]; then
        log "SUCCESS: Alert notification sent successfully"
        return 0
    else
        log "ERROR: Slack notification failed with HTTP status $http_status"
        log "ERROR: Response: $response_body"
        return 1
    fi
}

# Update metrics (simulate Prometheus counter increment)
update_metrics() {
    # In a real implementation, this would increment a Prometheus counter
    log "INFO: Incrementing metric: adaf_alerts_sent_total{severity=\"$ALERT_SEVERITY\"}"
    
    # This could write to a file that gets scraped by Prometheus, or
    # send to a pushgateway, or increment an in-memory counter
    echo "adaf_alerts_sent_total{severity=\"$ALERT_SEVERITY\"} $(date +%s)" >> /tmp/adaf_alerts_sent.prom 2>/dev/null || true
}

# Main execution
main() {
    log "INFO: ADAF Dashboard Slack Alert Notification Starting..."
    
    # Parse arguments
    parse_args "$@"
    
    # Validate parameters
    validate_params
    
    # Send notification
    if send_slack_notification; then
        log "SUCCESS: Alert notification completed successfully"
        update_metrics
        exit 0
    else
        log "ERROR: Alert notification failed"
        exit 1
    fi
}

# Execute main function
main "$@"