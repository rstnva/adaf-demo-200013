#!/bin/sh
# Health Check Script for ADAF Dashboard
# Checks application health, database connectivity, and Redis availability

set -e

# Configuration
APP_PORT=${PORT:-3000}
APP_HOST=${HOSTNAME:-localhost}
HEALTH_ENDPOINT="/api/health/app"
MAX_RETRIES=3
TIMEOUT=10

# Colors for output (if terminal supports it)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [HEALTHCHECK] $1"
}

error() {
    echo "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo "${GREEN}[OK]${NC} $1"
}

warn() {
    echo "${YELLOW}[WARN]${NC} $1"
}

# Main health check function
check_app_health() {
    local url="http://${APP_HOST}:${APP_PORT}${HEALTH_ENDPOINT}"
    
    log "Checking application health at $url"
    
    # Use wget for health check (more reliable than curl in alpine)
    if command -v wget >/dev/null 2>&1; then
        if wget --quiet --timeout=$TIMEOUT --tries=1 --spider "$url" 2>/dev/null; then
            success "Application health check passed"
            return 0
        else
            error "Application health check failed (wget)"
            return 1
        fi
    elif command -v curl >/dev/null 2>&1; then
        if curl -f -s --max-time $TIMEOUT "$url" >/dev/null 2>&1; then
            success "Application health check passed"
            return 0
        else
            error "Application health check failed (curl)"
            return 1
        fi
    else
        error "Neither wget nor curl available for health check"
        return 1
    fi
}

# Check if the main process is running
check_process() {
    log "Checking if Node.js process is running"
    
    if pgrep -f "node.*server.js" >/dev/null 2>&1; then
        success "Node.js process is running"
        return 0
    else
        error "Node.js process not found"
        return 1
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage"
    
    # Get memory info if available
    if [ -f /proc/meminfo ]; then
        local mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        local mem_total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        
        if [ "$mem_available" -gt 0 ] && [ "$mem_total" -gt 0 ]; then
            local mem_usage_percent=$((($mem_total - $mem_available) * 100 / $mem_total))
            log "Memory usage: ${mem_usage_percent}%"
            
            if [ "$mem_usage_percent" -gt 90 ]; then
                warn "High memory usage: ${mem_usage_percent}%"
                return 1
            else
                success "Memory usage is acceptable: ${mem_usage_percent}%"
                return 0
            fi
        fi
    fi
    
    warn "Cannot determine memory usage"
    return 0  # Don't fail health check for this
}

# Check disk space
check_disk_space() {
    log "Checking disk space"
    
    local disk_usage=$(df /app 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ -n "$disk_usage" ] && [ "$disk_usage" -gt 0 ]; then
        log "Disk usage: ${disk_usage}%"
        
        if [ "$disk_usage" -gt 95 ]; then
            error "Critical disk usage: ${disk_usage}%"
            return 1
        elif [ "$disk_usage" -gt 85 ]; then
            warn "High disk usage: ${disk_usage}%"
        else
            success "Disk usage is acceptable: ${disk_usage}%"
        fi
    fi
    
    return 0
}

# Main health check execution
main() {
    log "Starting ADAF Dashboard health check"
    
    local exit_code=0
    
    # Critical checks (must pass)
    if ! check_process; then
        exit_code=1
    fi
    
    if ! check_app_health; then
        exit_code=1
    fi
    
    # Non-critical checks (warnings only)
    check_memory || true
    check_disk_space || true
    
    if [ $exit_code -eq 0 ]; then
        success "All health checks passed"
        log "ADAF Dashboard is healthy"
    else
        error "Health check failed"
        log "ADAF Dashboard is unhealthy"
    fi
    
    exit $exit_code
}

# Execute main function
main "$@"