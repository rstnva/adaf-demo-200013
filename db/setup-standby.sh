#!/bin/bash
set -e

echo "Setting up PostgreSQL standby server..."

# Wait for primary to be ready
echo "Waiting for primary PostgreSQL server..."
until pg_isready -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$REPLICATION_USER"; do
    echo "Primary PostgreSQL is unavailable - sleeping"
    sleep 2
done

echo "Primary PostgreSQL is ready!"

# Check if this is first time setup
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing standby from primary..."
    
    # Remove any existing data directory contents
    rm -rf "$PGDATA"/*
    
    # Get replication password
    REPLICATION_PASSWORD=$(cat "$POSTGRES_REPLICATION_PASSWORD_FILE")
    
    # Create base backup from primary
    PGPASSWORD="$REPLICATION_PASSWORD" pg_basebackup \
        -h "$PRIMARY_HOST" \
        -D "$PGDATA" \
        -U "$REPLICATION_USER" \
        -P \
        -W \
        -R \
        -X stream \
        -S adaf_standby_slot
    
    echo "Base backup completed successfully."
    
    # Create standby.signal file
    touch "$PGDATA/standby.signal"
    
    # Set up recovery configuration in postgresql.auto.conf
    cat >> "$PGDATA/postgresql.auto.conf" <<EOF
primary_conninfo = 'host=$PRIMARY_HOST port=$PRIMARY_PORT user=$REPLICATION_USER password=$REPLICATION_PASSWORD application_name=adaf_standby'
primary_slot_name = 'adaf_standby_slot'
promote_trigger_file = '/tmp/postgresql.trigger'
EOF

else
    echo "Standby data directory already exists, starting normally..."
fi

echo "PostgreSQL standby setup completed."