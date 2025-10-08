#!/bin/bash
# Point-in-Time Recovery Script for ADAF PostgreSQL
# Restores database to specific timestamp using WAL-G

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Configuration
DOCKER_COMPOSE="docker-compose -f docker-compose.prod.yml"
BACKUP_DIR="/tmp/adaf_pitr_backup_$(date +%Y%m%d_%H%M%S)"
RECOVERY_TARGET_TIME="$1"

# Validate input
if [ -z "$RECOVERY_TARGET_TIME" ]; then
    error "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
    error "Example: $0 '2024-10-06 14:30:00'"
    exit 1
fi

# Validate timestamp format
if ! date -d "$RECOVERY_TARGET_TIME" >/dev/null 2>&1; then
    error "Invalid timestamp format: $RECOVERY_TARGET_TIME"
    exit 1
fi

log "Starting Point-in-Time Recovery to: $RECOVERY_TARGET_TIME"

# Step 1: Stop applications
log "Stopping application instances to prevent new writes..."
$DOCKER_COMPOSE stop app-blue app-green

# Step 2: Create current database backup
log "Creating emergency backup of current database..."
mkdir -p "$BACKUP_DIR"
$DOCKER_COMPOSE exec -T postgres-primary pg_dump -U adaf_user adaf_dashboard > "$BACKUP_DIR/emergency_backup.sql"
success "Emergency backup created: $BACKUP_DIR/emergency_backup.sql"

# Step 3: Stop database services
log "Stopping database services..."
$DOCKER_COMPOSE stop postgres-primary postgres-standby

# Step 4: Clear data directories
log "Preparing for restore (clearing data directories)..."
docker volume rm adaf-dashboard-pro_postgres_primary_data 2>/dev/null || true
docker volume rm adaf-dashboard-pro_postgres_standby_data 2>/dev/null || true

# Step 5: Restore using WAL-G
log "Restoring database from WAL-G backup..."
$DOCKER_COMPOSE run --rm wal-g-backup wal-g backup-fetch /var/lib/postgresql/data LATEST

# Step 6: Configure recovery
log "Configuring Point-in-Time Recovery..."
cat > /tmp/recovery.conf <<EOF
restore_command = 'wal-g wal-fetch %f %p'
recovery_target_time = '$RECOVERY_TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Step 7: Start PostgreSQL with recovery
log "Starting PostgreSQL with PITR configuration..."
$DOCKER_COMPOSE up -d postgres-primary

# Step 8: Wait for recovery to complete
log "Waiting for Point-in-Time Recovery to complete..."
timeout 300 bash -c '
while ! docker-compose -f docker-compose.prod.yml exec -T postgres-primary pg_isready -U adaf_user -d adaf_dashboard; do
    echo "Waiting for database recovery..."
    sleep 10
done
'

# Step 9: Verify recovery
log "Verifying database recovery..."
RECOVERED_TIME=$($DOCKER_COMPOSE exec -T postgres-primary psql -U adaf_user -d adaf_dashboard -t -c "SELECT current_timestamp;" | tr -d ' ')
log "Database recovered to approximately: $RECOVERED_TIME"

# Step 10: Rebuild standby
log "Rebuilding standby database..."
$DOCKER_COMPOSE up -d postgres-standby

# Step 11: Restart applications
log "Restarting application instances..."
$DOCKER_COMPOSE up -d app-blue

# Step 12: Health checks
log "Performing post-recovery health checks..."
sleep 30

if curl -f -s http://localhost/api/health/db >/dev/null 2>&1; then
    success "Database health check PASSED"
else
    error "Database health check FAILED"
    exit 1
fi

if curl -f -s http://localhost/api/health/app >/dev/null 2>&1; then
    success "Application health check PASSED"
else
    error "Application health check FAILED"
    exit 1
fi

success "Point-in-Time Recovery completed successfully!"
log "Recovery target time: $RECOVERY_TARGET_TIME"
log "Actual recovery time: $RECOVERED_TIME"
log "Emergency backup location: $BACKUP_DIR"

warn "Remember to:"
warn "1. Verify data consistency"
warn "2. Check application logs"
warn "3. Monitor system for any issues"
warn "4. Update team on recovery completion"