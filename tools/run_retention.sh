#!/bin/bash

# ================================================================================================
# Data Retention Runner Script
# ================================================================================================
# Production script for executing ADAF Dashboard data retention policies
# Supports dry-run mode, logging, and error handling
# Designed for cron scheduling and manual execution
# ================================================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs/retention"
API_BASE_URL="${API_BASE_URL:-http://localhost:3005}"
DRY_RUN="${DRY_RUN:-false}"
FORCE="${FORCE:-false}"
TIMEOUT="${TIMEOUT:-600}" # 10 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $timestamp - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $timestamp - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $timestamp - $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message"
            ;;
    esac
    
    # Also log to file if log directory exists
    if [[ -d "$LOG_DIR" ]]; then
        echo "[$level] $timestamp - $message" >> "$LOG_DIR/retention_$(date +%Y%m%d).log"
    fi
}

# Help function
show_help() {
    cat << EOF
ADAF Dashboard Data Retention Runner

Usage: $0 [OPTIONS]

Options:
    -d, --dry-run       Execute in dry-run mode (no data modifications)
    -f, --force         Force execution even if health checks fail
    -t, --timeout SECS  Set timeout in seconds (default: 600)
    -u, --url URL       Set API base URL (default: http://localhost:3005)
    -l, --log-dir DIR   Set log directory (default: $PROJECT_ROOT/logs/retention)
    -h, --help          Show this help message

Environment Variables:
    API_BASE_URL        Base URL for the ADAF Dashboard API
    DRY_RUN             Set to 'true' to enable dry-run mode
    FORCE               Set to 'true' to force execution
    TIMEOUT             Timeout in seconds for API calls

Examples:
    # Dry run to see what would be deleted
    $0 --dry-run
    
    # Execute retention policies
    $0
    
    # Force execution ignoring health checks
    $0 --force
    
    # Execute with custom timeout
    $0 --timeout 1200

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            -f|--force)
                FORCE="true"
                shift
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -u|--url)
                API_BASE_URL="$2"
                shift 2
                ;;
            -l|--log-dir)
                LOG_DIR="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Health check function
check_health() {
    log "INFO" "Performing health check..."
    
    local response
    local status_code
    
    # Check API availability
    response=$(curl -s -w "%{http_code}" "$API_BASE_URL/api/ops/retention/run" --connect-timeout 10 --max-time 30) || {
        log "ERROR" "Failed to connect to API at $API_BASE_URL"
        return 1
    }
    
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [[ "$status_code" != "200" ]]; then
        log "ERROR" "API health check failed with status $status_code"
        return 1
    fi
    
    # Parse health status from response
    local healthy
    healthy=$(echo "$response_body" | grep -o '"healthy":[^,]*' | cut -d':' -f2 | tr -d ' "')
    
    if [[ "$healthy" != "true" ]]; then
        log "WARN" "Retention job health check indicates issues"
        if [[ "$FORCE" != "true" ]]; then
            log "ERROR" "Health check failed. Use --force to override."
            return 1
        else
            log "WARN" "Forcing execution despite health check failures"
        fi
    fi
    
    log "SUCCESS" "Health check passed"
    return 0
}

# Execute retention job
execute_retention() {
    log "INFO" "Starting retention job execution..."
    log "INFO" "Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY-RUN" || echo "LIVE")"
    log "INFO" "Force: $FORCE"
    log "INFO" "Timeout: ${TIMEOUT}s"
    
    local payload="{\"dryRun\": $DRY_RUN, \"force\": $FORCE}"
    local response
    local status_code
    
    # Execute retention job via API
    response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        --connect-timeout 10 \
        --max-time "$TIMEOUT" \
        "$API_BASE_URL/api/ops/retention/run") || {
        log "ERROR" "Failed to execute retention job via API"
        return 1
    }
    
    status_code="${response: -3}"
    response_body="${response%???}"
    
    # Parse response
    local success
    success=$(echo "$response_body" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' "')
    
    if [[ "$status_code" =~ ^(200|207)$ ]] && [[ "$success" = "true" ]]; then
        log "SUCCESS" "Retention job completed successfully"
        
        # Extract and display summary
        local rows_affected
        local duration_ms
        local policies_executed
        
        rows_affected=$(echo "$response_body" | grep -o '"totalRowsAffected":[^,]*' | cut -d':' -f2 | tr -d ' "')
        duration_ms=$(echo "$response_body" | grep -o '"totalDurationMs":[^,]*' | cut -d':' -f2 | tr -d ' "')
        policies_executed=$(echo "$response_body" | grep -o '"policiesExecuted":[^,]*' | cut -d':' -f2 | tr -d ' "')
        
        log "INFO" "Summary: $rows_affected rows affected, $policies_executed policies executed, ${duration_ms}ms duration"
        
        return 0
        
    elif [[ "$status_code" = "207" ]]; then
        log "WARN" "Retention job completed with some failures"
        
        local failed_policies
        failed_policies=$(echo "$response_body" | grep -o '"failedPolicies":[^,]*' | cut -d':' -f2 | tr -d ' "')
        
        log "WARN" "$failed_policies policies failed - check logs for details"
        return 2
        
    else
        log "ERROR" "Retention job failed with status $status_code"
        
        local error_message
        error_message=$(echo "$response_body" | grep -o '"message":"[^"]*"' | cut -d':' -f2 | tr -d '"')
        
        if [[ -n "$error_message" ]]; then
            log "ERROR" "Error: $error_message"
        fi
        
        return 1
    fi
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "🗂️  ADAF Dashboard Data Retention Job Started"
    log "INFO" "Script: $0"
    log "INFO" "Working directory: $(pwd)"
    log "INFO" "API URL: $API_BASE_URL"
    
    # Create log directory if it doesn't exist
    if [[ ! -d "$LOG_DIR" ]]; then
        mkdir -p "$LOG_DIR" || {
            log "WARN" "Could not create log directory: $LOG_DIR"
        }
    fi
    
    # Parse arguments
    parse_args "$@"
    
    # Health check (unless in dry-run mode)
    if [[ "$DRY_RUN" != "true" ]] && ! check_health; then
        log "ERROR" "Pre-execution health check failed"
        exit 1
    fi
    
    # Execute retention job
    local exit_code=0
    if ! execute_retention; then
        exit_code=$?
        log "ERROR" "Retention job execution failed"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $exit_code -eq 0 ]]; then
        log "SUCCESS" "✅ Retention job completed successfully in ${duration}s"
    elif [[ $exit_code -eq 2 ]]; then
        log "WARN" "⚠️  Retention job completed with warnings in ${duration}s"
    else
        log "ERROR" "❌ Retention job failed after ${duration}s"
    fi
    
    exit $exit_code
}

# Execute main function with all arguments
main "$@"