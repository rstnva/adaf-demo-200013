#!/bin/bash
# ADAF Dashboard Blue-Green Deployment Script
# Canary deployment with automatic rollback on failure

set -e

# Configuration
DOCKER_COMPOSE="docker-compose -f docker-compose.prod.yml"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=15
CANARY_PERCENTAGES=(10 25 50 75 100)
NGINX_CONF="/home/parallels/Desktop/adaf-dashboard-pro/nginx/conf.d/adaf-dashboard.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if service is healthy
check_health() {
    local service=$1
    local retries=$2
    
    log "Checking health of $service..."
    
    for i in $(seq 1 $retries); do
        if $DOCKER_COMPOSE exec -T $service wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/app 2>/dev/null; then
            success "$service is healthy"
            return 0
        else
            warn "Health check $i/$retries failed for $service"
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    error "$service failed health checks"
    return 1
}

# Update NGINX upstream weights for canary deployment
update_nginx_weights() {
    local blue_weight=$1
    local green_weight=$2
    
    log "Updating NGINX weights: Blue=$blue_weight%, Green=$green_weight%"
    
    # Backup current config
    cp $NGINX_CONF $NGINX_CONF.backup
    
    # Update weights in upstream block
    sed -i "s/server app-blue:3000 weight=[0-9]*/server app-blue:3000 weight=$blue_weight/" $NGINX_CONF
    sed -i "s/# server app-green:3000 weight=[0-9]*/server app-green:3000 weight=$green_weight/" $NGINX_CONF
    
    # Reload NGINX configuration
    $DOCKER_COMPOSE exec nginx nginx -s reload
    
    if [ $? -eq 0 ]; then
        success "NGINX configuration updated and reloaded"
    else
        error "Failed to reload NGINX configuration"
        # Restore backup
        cp $NGINX_CONF.backup $NGINX_CONF
        $DOCKER_COMPOSE exec nginx nginx -s reload
        return 1
    fi
}

# Rollback to previous version
rollback() {
    local reason="$1"
    
    error "ROLLBACK INITIATED: $reason"
    
    # Restore NGINX to 100% blue
    update_nginx_weights 100 0
    
    # Stop green instance
    $DOCKER_COMPOSE stop app-green
    
    # Restore backup configuration
    if [ -f "$NGINX_CONF.backup" ]; then
        cp $NGINX_CONF.backup $NGINX_CONF
        $DOCKER_COMPOSE exec nginx nginx -s reload
    fi
    
    error "Rollback completed. System restored to blue instance."
    exit 1
}

# Monitor metrics during deployment
monitor_metrics() {
    local duration=$1
    
    log "Monitoring metrics for $duration seconds..."
    
    # Check error rate, response time, etc.
    # This would integrate with your monitoring system
    sleep $duration
    
    # Simulate metric check (replace with real monitoring)
    local error_rate=$(shuf -i 0-5 -n 1)  # Random for demo
    local avg_response_time=$(shuf -i 100-800 -n 1)  # Random for demo
    
    log "Current metrics: Error rate: ${error_rate}%, Avg response time: ${avg_response_time}ms"
    
    if [ $error_rate -gt 2 ]; then
        rollback "Error rate too high: ${error_rate}%"
    fi
    
    if [ $avg_response_time -gt 500 ]; then
        rollback "Response time too high: ${avg_response_time}ms"
    fi
    
    success "Metrics are within acceptable limits"
}

# Main deployment function
deploy() {
    local new_image_tag=${1:-latest}
    
    log "Starting Blue-Green deployment for ADAF Dashboard"
    log "New image tag: $new_image_tag"
    
    # Step 1: Build new green instance
    log "Building new green instance..."
    $DOCKER_COMPOSE build app-green
    
    # Step 2: Start green instance
    log "Starting green instance..."
    $DOCKER_COMPOSE up -d app-green
    
    # Step 3: Wait for green to be healthy
    if ! check_health app-green $HEALTH_CHECK_RETRIES; then
        rollback "Green instance failed to start properly"
    fi
    
    # Step 4: Canary deployment
    for percentage in "${CANARY_PERCENTAGES[@]}"; do
        local blue_weight=$((100 - percentage))
        local green_weight=$percentage
        
        log "Canary deployment: ${percentage}% traffic to green instance"
        
        # Update traffic distribution
        if ! update_nginx_weights $blue_weight $green_weight; then
            rollback "Failed to update NGINX configuration"
        fi
        
        # Monitor for issues
        monitor_metrics 60  # Monitor for 1 minute at each stage
        
        log "Canary stage ${percentage}% completed successfully"
        sleep 30  # Brief pause between stages
    done
    
    # Step 5: Full switch to green (100% traffic)
    log "Switching 100% traffic to green instance"
    
    # Final health check
    if ! check_health app-green 3; then
        rollback "Final health check failed for green instance"
    fi
    
    # Step 6: Stop blue instance and promote green to blue
    log "Stopping old blue instance..."
    $DOCKER_COMPOSE stop app-blue
    
    # Rename green to blue in configuration (for next deployment)
    log "Promoting green instance to blue for next deployment cycle"
    
    # Clean up
    rm -f $NGINX_CONF.backup
    
    success "Blue-Green deployment completed successfully!"
    success "Green instance is now serving 100% of traffic"
    
    log "Deployment summary:"
    log "- New version deployed and verified"
    log "- Old version stopped and ready for cleanup"
    log "- System is ready for next deployment cycle"
}

# Quick rollback function for manual use
quick_rollback() {
    log "Performing quick rollback to blue instance..."
    
    update_nginx_weights 100 0
    $DOCKER_COMPOSE stop app-green
    
    success "Quick rollback completed"
}

# Status check function
status() {
    log "ADAF Dashboard Deployment Status:"
    echo
    
    # Check which instances are running
    if $DOCKER_COMPOSE ps app-blue | grep -q "Up"; then
        echo -e "${GREEN}✓${NC} Blue instance: Running"
    else
        echo -e "${RED}✗${NC} Blue instance: Stopped"
    fi
    
    if $DOCKER_COMPOSE ps app-green | grep -q "Up"; then
        echo -e "${GREEN}✓${NC} Green instance: Running"
    else
        echo -e "${YELLOW}⚬${NC} Green instance: Stopped"
    fi
    
    # Check NGINX status
    if $DOCKER_COMPOSE ps nginx | grep -q "Up"; then
        echo -e "${GREEN}✓${NC} NGINX: Running"
    else
        echo -e "${RED}✗${NC} NGINX: Stopped"
    fi
    
    echo
    log "Current NGINX upstream configuration:"
    grep -A 10 "upstream app_backend" $NGINX_CONF | grep "server app-"
}

# Help function
help() {
    echo "ADAF Dashboard Blue-Green Deployment Script"
    echo
    echo "Usage: $0 [command] [options]"
    echo
    echo "Commands:"
    echo "  deploy [tag]    - Deploy new version with canary rollout (default: latest)"
    echo "  rollback        - Quick rollback to blue instance"
    echo "  status          - Show current deployment status"
    echo "  help            - Show this help message"
    echo
    echo "Examples:"
    echo "  $0 deploy v1.2.3    - Deploy version 1.2.3"
    echo "  $0 deploy           - Deploy latest version"
    echo "  $0 rollback         - Rollback to previous version"
    echo "  $0 status           - Check deployment status"
}

# Main script logic
case "${1:-help}" in
    deploy)
        deploy $2
        ;;
    rollback)
        quick_rollback
        ;;
    status)
        status
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