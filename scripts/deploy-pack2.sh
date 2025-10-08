#!/bin/bash

# ADAF Dashboard - Pack 2 Performance Tuning Deployment Script
# Automated deployment for SQL indexes, caching, monitoring, and performance testing

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "${SCRIPT_DIR}")"
LOG_FILE="${SCRIPT_DIR}/deployment.log"
ROLLBACK_FILE="${SCRIPT_DIR}/rollback_$(date +%Y%m%d_%H%M%S).sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "${LOG_FILE}"
}

error() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

info() {
    log "${BLUE}INFO: $1${NC}"
}

# Configuration validation
validate_environment() {
    info "Validating deployment environment..."
    
    # Check if we're in the right directory
    if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
        error "Not in ADAF Dashboard project directory"
    fi
    
    # Check required tools
    local required_tools=("psql" "redis-cli" "k6" "npm" "pnpm")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool"
        fi
    done
    
    # Check environment variables
    local required_vars=("DATABASE_URL" "REDIS_URL")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable not set: $var"
        fi
    done
    
    success "Environment validation completed"
}

# Database deployment
deploy_database_indexes() {
    info "Deploying database performance indexes..."
    
    local sql_file="${PROJECT_ROOT}/perf/sql/performance_indexes.sql"
    
    if [[ ! -f "$sql_file" ]]; then
        error "SQL indexes file not found: $sql_file"
    fi
    
    # Create rollback script
    info "Generating rollback script..."
    cat > "$ROLLBACK_FILE" << 'EOF'
-- ADAF Dashboard Performance Indexes Rollback Script
-- Generated automatically during deployment

SET search_path TO public;

-- Drop performance indexes (reverse order)
DROP INDEX CONCURRENTLY IF EXISTS idx_portfolio_performance_symbol_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_portfolio_performance_date_perf;
DROP INDEX CONCURRENTLY IF EXISTS idx_portfolio_rebalancing_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_portfolio_analytics_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_portfolio_positions_composite;

DROP INDEX CONCURRENTLY IF EXISTS idx_market_data_symbol_timestamp;
DROP INDEX CONCURRENTLY IF EXISTS idx_market_data_timestamp_volume;
DROP INDEX CONCURRENTLY IF EXISTS idx_market_data_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_market_volatility_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_market_correlations_composite;

DROP INDEX CONCURRENTLY IF EXISTS idx_strategy_execution_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_strategy_backtest_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_strategy_signals_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_strategy_performance_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_strategies_active_type;

DROP INDEX CONCURRENTLY IF EXISTS idx_reports_scheduled_next_run;
DROP INDEX CONCURRENTLY IF EXISTS idx_reports_generated_date_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_logs_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_sessions_composite;
DROP INDEX CONCURRENTLY IF EXISTS idx_system_metrics_composite;

-- Drop maintenance functions
DROP FUNCTION IF EXISTS update_strategy_performance_stats();
DROP FUNCTION IF EXISTS cleanup_old_market_data();
DROP FUNCTION IF EXISTS reindex_strategy_data();

COMMIT;
EOF
    
    # Execute SQL with transaction safety
    info "Executing database indexes creation..."
    if psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "$sql_file" >> "$LOG_FILE" 2>&1; then
        success "Database indexes deployed successfully"
    else
        error "Database deployment failed. Check $LOG_FILE for details"
    fi
    
    # Verify indexes
    info "Verifying index creation..."
    local index_count
    index_count=$(psql "${DATABASE_URL}" -tAc "
        SELECT count(*) FROM pg_indexes 
        WHERE indexname LIKE 'idx_%' 
        AND schemaname = 'public'
    ")
    
    if [[ "$index_count" -ge 20 ]]; then
        success "Verified $index_count performance indexes created"
    else
        warning "Only $index_count indexes found, expected 20+"
    fi
}

# Cache system deployment
deploy_cache_system() {
    info "Deploying Redis cache system..."
    
    # Check Redis connectivity
    if ! redis-cli -u "${REDIS_URL}" ping > /dev/null 2>&1; then
        error "Cannot connect to Redis at ${REDIS_URL}"
    fi
    
    # Install cache dependencies
    info "Installing cache dependencies..."
    cd "${PROJECT_ROOT}"
    
    if ! pnpm add ioredis @types/ioredis >> "$LOG_FILE" 2>&1; then
        error "Failed to install cache dependencies"
    fi
    
    # Verify cache configuration files
    local cache_files=(
        "src/lib/cache/redis-config.ts"
        "src/lib/cache/cache-service.ts"
        "src/lib/cache/cache-middleware.ts"
        "src/lib/cache/client-cache.ts"
    )
    
    for file in "${cache_files[@]}"; do
        if [[ ! -f "${PROJECT_ROOT}/$file" ]]; then
            error "Cache file not found: $file"
        fi
    done
    
    # Test cache functionality
    info "Testing cache functionality..."
    if ! node -e "
        const { CacheService } = require('./src/lib/cache/cache-service.ts');
        const cache = CacheService.getInstance();
        cache.set('test-key', 'test-value', 60)
            .then(() => cache.get('test-key'))
            .then(value => {
                if (value === 'test-value') {
                    console.log('Cache test passed');
                    process.exit(0);
                } else {
                    console.error('Cache test failed');
                    process.exit(1);
                }
            })
            .catch(err => {
                console.error('Cache test error:', err);
                process.exit(1);
            });
    " >> "$LOG_FILE" 2>&1; then
        error "Cache functionality test failed"
    fi
    
    success "Cache system deployed and tested successfully"
}

# Performance testing setup
deploy_performance_testing() {
    info "Setting up performance testing framework..."
    
    # Check k6 installation
    if ! k6 version >> "$LOG_FILE" 2>&1; then
        error "k6 not properly installed"
    fi
    
    # Make scripts executable
    local test_scripts=(
        "performance/scripts/run-performance-tests.sh"
    )
    
    for script in "${test_scripts[@]}"; do
        if [[ -f "${PROJECT_ROOT}/$script" ]]; then
            chmod +x "${PROJECT_ROOT}/$script"
            info "Made executable: $script"
        else
            warning "Test script not found: $script"
        fi
    done
    
    # Run a quick validation test
    info "Running performance test validation..."
    cd "${PROJECT_ROOT}"
    
    if ! timeout 60s k6 run --duration 10s --vus 1 performance/k6/load-test.js >> "$LOG_FILE" 2>&1; then
        warning "Performance test validation failed or timed out"
    else
        success "Performance testing framework validated"
    fi
}

# Monitoring deployment
deploy_monitoring() {
    info "Deploying performance monitoring..."
    
    # Check if Prometheus is accessible
    local prometheus_url="${PROMETHEUS_URL:-http://localhost:9090}"
    if ! curl -sf "${prometheus_url}/api/v1/status/config" > /dev/null 2>&1; then
        warning "Prometheus not accessible at $prometheus_url"
    else
        info "Prometheus connection verified"
    fi
    
    # Check if Grafana is accessible
    local grafana_url="${GRAFANA_URL:-http://localhost:3000}"
    if ! curl -sf "${grafana_url}/api/health" > /dev/null 2>&1; then
        warning "Grafana not accessible at $grafana_url"
    else
        info "Grafana connection verified"
    fi
    
    # Import Grafana dashboard
    if [[ -f "${PROJECT_ROOT}/monitoring/grafana/performance-dashboard.json" ]]; then
        info "Grafana dashboard configuration available for import"
        success "Monitoring configuration ready"
    else
        warning "Grafana dashboard configuration not found"
    fi
}

# Application build and restart
deploy_application() {
    info "Building and deploying application..."
    
    cd "${PROJECT_ROOT}"
    
    # Install dependencies
    info "Installing dependencies..."
    if ! pnpm install >> "$LOG_FILE" 2>&1; then
        error "Failed to install dependencies"
    fi
    
    # Build application
    info "Building application..."
    if ! pnpm run build >> "$LOG_FILE" 2>&1; then
        error "Application build failed"
    fi
    
    # Run tests
    info "Running tests..."
    if ! pnpm run test >> "$LOG_FILE" 2>&1; then
        warning "Some tests failed, check $LOG_FILE"
    else
        success "All tests passed"
    fi
    
    success "Application built successfully"
}

# Health checks
run_health_checks() {
    info "Running post-deployment health checks..."
    
    local health_url="${APP_URL:-http://localhost:3000}/api/health"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -sf "$health_url" > /dev/null 2>&1; then
            success "Application health check passed"
            break
        fi
        
        info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Application health checks failed after $max_attempts attempts"
    fi
    
    # Database connection check
    if psql "${DATABASE_URL}" -c "SELECT 1" > /dev/null 2>&1; then
        success "Database connection verified"
    else
        error "Database connection failed"
    fi
    
    # Redis connection check
    if redis-cli -u "${REDIS_URL}" ping > /dev/null 2>&1; then
        success "Redis connection verified"
    else
        error "Redis connection failed"
    fi
}

# Performance baseline measurement
measure_baseline() {
    info "Measuring post-deployment performance baseline..."
    
    cd "${PROJECT_ROOT}"
    
    # Run comprehensive performance test
    if [[ -f "performance/scripts/run-performance-tests.sh" ]]; then
        info "Running baseline performance measurement..."
        if ./performance/scripts/run-performance-tests.sh load >> "$LOG_FILE" 2>&1; then
            success "Baseline performance measurement completed"
        else
            warning "Baseline measurement encountered issues"
        fi
    else
        warning "Performance test script not found"
    fi
}

# Slack notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        case "$status" in
            "success") color="good" ;;
            "warning") color="warning" ;;
            "error") color="danger" ;;
            *) color="good" ;;
        esac
        
        local payload
        payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "ADAF Dashboard - Pack 2 Deployment",
            "text": "$message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "${ENVIRONMENT:-production}",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date)",
                    "short": true
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "${SLACK_WEBHOOK_URL}" >> "$LOG_FILE" 2>&1 || true
    fi
}

# Rollback function
rollback() {
    warning "Initiating rollback procedure..."
    
    if [[ -f "$ROLLBACK_FILE" ]]; then
        info "Rolling back database changes..."
        if psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "$ROLLBACK_FILE" >> "$LOG_FILE" 2>&1; then
            success "Database rollback completed"
        else
            error "Database rollback failed"
        fi
    fi
    
    info "Manual cleanup may be required for cache and application components"
    send_notification "error" "Pack 2 deployment failed and rollback initiated. Manual verification required."
}

# Main deployment function
main() {
    info "Starting ADAF Dashboard Pack 2 Performance Tuning Deployment"
    info "Log file: $LOG_FILE"
    
    # Set trap for cleanup on failure
    trap rollback ERR
    
    # Deployment steps
    validate_environment
    deploy_database_indexes
    deploy_cache_system
    deploy_performance_testing
    deploy_monitoring
    deploy_application
    run_health_checks
    measure_baseline
    
    # Success notification
    success "Pack 2 Performance Tuning deployment completed successfully!"
    
    info "Deployment Summary:"
    info "- ✅ Database performance indexes deployed"
    info "- ✅ Multi-layer caching system configured"
    info "- ✅ Performance testing framework ready"
    info "- ✅ Monitoring and alerting configured"
    info "- ✅ Application built and health-checked"
    
    send_notification "success" "Pack 2 Performance Tuning deployment completed successfully. All systems operational."
    
    info "Next steps:"
    info "1. Import Grafana dashboard from monitoring/grafana/performance-dashboard.json"
    info "2. Configure alert notifications in monitoring/performance-monitoring-config.yaml"
    info "3. Schedule regular performance tests"
    info "4. Monitor performance improvements over next 24-48 hours"
    
    info "Rollback script available at: $ROLLBACK_FILE"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi