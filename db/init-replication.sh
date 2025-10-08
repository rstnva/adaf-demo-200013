#!/bin/bash
set -e

echo "Initializing PostgreSQL replication setup..."

# Create replication user if it doesn't exist
if [ -n "$POSTGRES_REPLICATION_USER" ] && [ -n "$POSTGRES_REPLICATION_PASSWORD_FILE" ]; then
    REPLICATION_PASSWORD=$(cat "$POSTGRES_REPLICATION_PASSWORD_FILE")
    
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        -- Create replication user if not exists
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$POSTGRES_REPLICATION_USER') THEN
                CREATE ROLE $POSTGRES_REPLICATION_USER WITH REPLICATION LOGIN PASSWORD '$REPLICATION_PASSWORD';
            END IF;
        END
        \$\$;
        
        -- Grant necessary permissions
        GRANT CONNECT ON DATABASE $POSTGRES_DB TO $POSTGRES_REPLICATION_USER;
        
        -- Create replication slot
        SELECT pg_create_physical_replication_slot('adaf_standby_slot');
EOSQL

    echo "Replication user '$POSTGRES_REPLICATION_USER' created successfully."
fi

echo "PostgreSQL replication initialization completed."