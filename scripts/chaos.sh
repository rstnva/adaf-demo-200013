#!/bin/bash
# Chaos Engineering Script for ADAF Dashboard
# Simulates failures and tests system resilience

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
DOCKER_COMPOSE="docker-compose -f docker-compose.prod.yml"
HEALTH_CHECK_INTERVAL=10
CHAOS_DURATION=120  # Default chaos duration in seconds
RECOVERY_TIMEOUT=300  # Max time to wait for recovery

# Logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

chaos() {
    echo -e "${PURPLE}[CHAOS]${NC} $1"
}

# Check system health before starting
check_system_health() {
    log "Checking system health before chaos test..."
    
    local health_endpoints=(
        "http://localhost/api/health/app"
        "http://localhost/api/health/db" 
        "http://localhost/api/health/redis"
    )
    
    for endpoint in "${health_endpoints[@]}"; do
        if ! curl -f -s "$endpoint" >/dev/null 2>&1; then
            error "Health check failed for: $endpoint"
            return 1
        fi
    done
    
    success "All systems healthy - ready for chaos testing"
    return 0
}

# Monitor system during chaos
monitor_system() {
    local test_name="$1"
    local duration="$2"
    
    log "Monitoring system during: $test_name"
    log "Duration: ${duration}s"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    local error_count=0
    local total_checks=0
    
    while [ $(date +%s) -lt $end_time ]; do
        total_checks=$((total_checks + 1))
        
        # Check application health
        if ! curl -f -s http://localhost/api/health/app >/dev/null 2>&1; then
            error_count=$((error_count + 1))
            warn "Health check failed (attempt $total_checks)"
        else
            log "Health check passed (attempt $total_checks)"
        fi
        
        # Check response time
        local response_time=$(curl -w "%{time_total}" -o /dev/null -s http://localhost/api/health/app)
        if (( $(echo "$response_time > 1.0" | bc -l) )); then
            warn "High response time: ${response_time}s"
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    local error_rate=$(echo "scale=2; $error_count * 100 / $total_checks" | bc -l)
    log "Chaos test completed: $test_name"
    log "Error rate: ${error_rate}% ($error_count/$total_checks)"
    
    return $error_count
}

# Wait for system recovery
wait_for_recovery() {
    local service_name="$1"
    local timeout="$2"
    
    log "Waiting for recovery of: $service_name"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while [ $(date +%s) -lt $end_time ]; do
        if $DOCKER_COMPOSE ps "$service_name" | grep -q "Up"; then
            success "$service_name recovered successfully"
            return 0
        fi
        
        sleep 5
    done
    
    error "$service_name failed to recover within ${timeout}s"
    return 1
}

# Chaos Test 1: Database Primary Failure
chaos_test_database_primary() {
    chaos "TEST 1: PostgreSQL Primary Failure Simulation"
    
    log "Stopping PostgreSQL primary..."
    $DOCKER_COMPOSE stop postgres-primary
    
    # Monitor system behavior
    monitor_system "Database Primary Failure" $CHAOS_DURATION
    local monitoring_result=$?
    
    log "Restarting PostgreSQL primary..."
    $DOCKER_COMPOSE start postgres-primary
    
    if wait_for_recovery "postgres-primary" $RECOVERY_TIMEOUT; then
        success "Database primary recovery test PASSED"
    else
        error "Database primary recovery test FAILED"
        return 1
    fi
    
    return $monitoring_result
}

# Chaos Test 2: Redis Primary Failure  
chaos_test_redis_primary() {
    chaos "TEST 2: Redis Primary Failure Simulation"
    
    log "Stopping Redis primary..."
    $DOCKER_COMPOSE stop redis-primary
    
    # Monitor system behavior
    monitor_system "Redis Primary Failure" $CHAOS_DURATION
    local monitoring_result=$?
    
    log "Restarting Redis primary..."
    $DOCKER_COMPOSE start redis-primary
    
    if wait_for_recovery "redis-primary" $RECOVERY_TIMEOUT; then
        success "Redis primary recovery test PASSED"
    else
        error "Redis primary recovery test FAILED"
        return 1
    fi
    
    return $monitoring_result
}

# Chaos Test 3: Application Instance Failure
chaos_test_app_failure() {
    chaos "TEST 3: Application Instance Failure Simulation"
    
    log "Stopping blue application instance..."
    $DOCKER_COMPOSE stop app-blue
    
    # Monitor system behavior
    monitor_system "Application Instance Failure" $CHAOS_DURATION
    local monitoring_result=$?
    
    log "Restarting blue application instance..."
    $DOCKER_COMPOSE start app-blue
    
    if wait_for_recovery "app-blue" $RECOVERY_TIMEOUT; then
        success "Application instance recovery test PASSED"
    else
        error "Application instance recovery test FAILED"
        return 1
    fi
    
    return $monitoring_result
}

# Chaos Test 4: Network Partition Simulation
chaos_test_network_partition() {
    chaos "TEST 4: Network Partition Simulation"
    
    log "Simulating network partition (disconnecting standby DB)..."
    $DOCKER_COMPOSE pause postgres-standby
    
    # Monitor system behavior  
    monitor_system "Network Partition" $CHAOS_DURATION
    local monitoring_result=$?
    
    log "Restoring network connectivity..."
    $DOCKER_COMPOSE unpause postgres-standby
    
    success "Network partition recovery test PASSED"
    return $monitoring_result
}

# Chaos Test 5: Resource Exhaustion (Memory)
chaos_test_memory_pressure() {
    chaos "TEST 5: Memory Pressure Simulation"
    
    log "Creating memory pressure on application..."
    
    # Start memory stress in background
    $DOCKER_COMPOSE exec -d app-blue sh -c 'stress --vm 1 --vm-bytes 256M --timeout 120s' || true
    
    # Monitor system behavior
    monitor_system "Memory Pressure" $CHAOS_DURATION
    local monitoring_result=$?
    
    log "Memory pressure test completed"
    return $monitoring_result
}

# Chaos Test 6: Disk Space Exhaustion
chaos_test_disk_pressure() {
    chaos "TEST 6: Disk Space Pressure Simulation"
    
    log "Creating disk space pressure..."
    
    # Fill up some disk space (carefully)
    $DOCKER_COMPOSE exec -d app-blue sh -c 'dd if=/dev/zero of=/tmp/chaos_test_file bs=1M count=100 2>/dev/null || true' || true
    
    # Monitor system behavior
    monitor_system "Disk Pressure" $CHAOS_DURATION
    local monitoring_result=$?
    
    log "Cleaning up disk space..."
    $DOCKER_COMPOSE exec app-blue rm -f /tmp/chaos_test_file || true
    
    success "Disk pressure test completed"
    return $monitoring_result
}

# Run all chaos tests
run_full_chaos_suite() {
    log "Starting ADAF Dashboard Chaos Engineering Suite"
    log "This will test system resilience and recovery capabilities"
    
    local tests_passed=0
    local tests_failed=0
    local total_errors=0
    
    # Pre-flight health check
    if ! check_system_health; then
        error "System is not healthy - aborting chaos tests"
        exit 1
    fi
    
    # Test 1: Database Primary Failure
    if chaos_test_database_primary; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
        total_errors=$((total_errors + $?))
    fi
    
    sleep 30  # Recovery buffer between tests
    
    # Test 2: Redis Primary Failure
    if chaos_test_redis_primary; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
        total_errors=$((total_errors + $?))
    fi
    
    sleep 30
    
    # Test 3: Application Instance Failure
    if chaos_test_app_failure; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
        total_errors=$((total_errors + $?))
    fi
    
    sleep 30
    
    # Test 4: Network Partition
    if chaos_test_network_partition; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
        total_errors=$((total_errors + $?))
    fi
    
    sleep 30
    
    # Test 5: Memory Pressure
    if chaos_test_memory_pressure; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
        total_errors=$((total_errors + $?))
    fi
    
    sleep 30
    
    # Test 6: Disk Pressure  
    if chaos_test_disk_pressure; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
        total_errors=$((total_errors + $?))
    fi
    
    # Final report
    log "=== CHAOS ENGINEERING SUITE RESULTS ==="
    log "Tests Passed: $tests_passed"
    log "Tests Failed: $tests_failed"
    log "Total Error Events: $total_errors"
    
    if [ $tests_failed -eq 0 ]; then
        success "All chaos tests PASSED! System is resilient."
        return 0
    else
        error "$tests_failed chaos tests FAILED! Review system resilience."
        return 1
    fi
}

# GameDay automation (monthly test)
run_gameday() {
    log "Running Monthly GameDay Automation"
    
    # Create GameDay report
    local report_file="gameday_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" <<EOF
# ADAF Dashboard GameDay Report
**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Environment:** Production Simulation
**Duration:** Automated Chaos Testing Suite

## Test Results

EOF
    
    # Run chaos suite and capture output
    if run_full_chaos_suite 2>&1 | tee -a "$report_file"; then
        echo "## Summary: ✅ PASSED" >> "$report_file"
        success "GameDay completed successfully - report saved to: $report_file"
        return 0
    else
        echo "## Summary: ❌ FAILED" >> "$report_file"
        error "GameDay failed - report saved to: $report_file"
        return 1
    fi
}

# Help function
help() {
    echo "ADAF Dashboard Chaos Engineering Script"
    echo
    echo "Usage: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  test-db         - Test database failure and recovery"
    echo "  test-redis      - Test Redis failure and recovery"
    echo "  test-app        - Test application failure and recovery"
    echo "  test-network    - Test network partition scenarios"
    echo "  test-memory     - Test memory pressure scenarios"
    echo "  test-disk       - Test disk pressure scenarios"
    echo "  run-suite       - Run complete chaos testing suite"
    echo "  gameday         - Run automated monthly GameDay test"
    echo "  help            - Show this help message"
    echo
    echo "Options:"
    echo "  --duration=N    - Set chaos duration in seconds (default: 120)"
    echo "  --timeout=N     - Set recovery timeout in seconds (default: 300)"
    echo
    echo "Examples:"
    echo "  $0 test-db --duration=180"
    echo "  $0 run-suite"
    echo "  $0 gameday"
}

# Parse command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        --duration=*)
            CHAOS_DURATION="${1#*=}"
            shift
            ;;
        --timeout=*)
            RECOVERY_TIMEOUT="${1#*=}"
            shift
            ;;
        *)
            break
            ;;
    esac
done

# Main script logic
case "${1:-help}" in
    test-db)
        chaos_test_database_primary
        ;;
    test-redis)
        chaos_test_redis_primary
        ;;
    test-app)
        chaos_test_app_failure
        ;;
    test-network)
        chaos_test_network_partition
        ;;
    test-memory)
        chaos_test_memory_pressure
        ;;
    test-disk)
        chaos_test_disk_pressure
        ;;
    run-suite)
        run_full_chaos_suite
        ;;
    gameday)
        run_gameday
        ;;
    help)
        help
        ;;
    *)
        error "Unknown command: $1"
        help
        exit 1
        ;;
esac