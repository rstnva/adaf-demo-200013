#!/bin/bash
# WAL-G Backup Cron Script for ADAF PostgreSQL
# Runs continuous backups with retention policy

set -e

echo "Starting WAL-G backup daemon..."

# Full backup function
perform_full_backup() {
    echo "$(date): Starting full backup..."
    wal-g backup-push "$PGDATA"
    if [ $? -eq 0 ]; then
        echo "$(date): Full backup completed successfully"
    else
        echo "$(date): Full backup failed!" >&2
        exit 1
    fi
}

# Cleanup old backups function
cleanup_old_backups() {
    echo "$(date): Cleaning up old backups (retain 30 full, 90 days WAL)..."
    wal-g delete retain FULL 30
    wal-g delete before FIND_FULL $(date -d '90 days ago' --iso-8601)
    echo "$(date): Cleanup completed"
}

# Initial full backup if none exists
if ! wal-g backup-list | grep -q "backup_"; then
    echo "No existing backups found, performing initial full backup..."
    perform_full_backup
fi

# Continuous backup loop
while true; do
    # Full backup every 24 hours (86400 seconds)
    if [ $(($(date +%s) % 86400)) -lt 300 ]; then
        perform_full_backup
        
        # Cleanup old backups after successful full backup
        cleanup_old_backups
        
        # Sleep to avoid multiple backups in the same 5-minute window
        sleep 300
    fi
    
    # Check WAL archiving health every 5 minutes
    if ! wal-g wal-verify; then
        echo "$(date): WAL archiving verification failed!" >&2
    fi
    
    # Sleep for 5 minutes before next check
    sleep 300
done