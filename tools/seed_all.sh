#!/bin/bash
# Seed All - Complete data seeding for testing environments

set -e

DB_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/adaf"}
POSTGRES_HOST=${POSTGRES_HOST:-"localhost"}
POSTGRES_PORT=${POSTGRES_PORT:-"5432"}
POSTGRES_USER=${POSTGRES_USER:-"postgres"}
POSTGRES_DB=${POSTGRES_DB:-"adaf"}

echo "🌱 ADAF Complete Data Seeding"
echo "Database: $POSTGRES_DB at $POSTGRES_HOST:$POSTGRES_PORT"
echo

# Function to run SQL file
run_sql() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo "📄 $description"
    if [ -n "$DATABASE_URL" ]; then
      psql "$DATABASE_URL" -f "$file"
    else
      PGPASSWORD=postgres psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$file"
    fi
    echo "✅ $description completed"
    echo
  else
    echo "⚠️  $file not found, skipping $description"
    echo
  fi
}

# 1. RBAC Foundation Data
run_sql "prisma/seeds/seed_rbac.sql" "RBAC roles, users, and API keys"

# 2. Opportunity Pipeline Data
if [ -f "prisma/seeds/seed_opx.sql" ]; then
  run_sql "prisma/seeds/seed_opx.sql" "OP-X opportunities and signals"
fi

# 3. Data Quality Monitoring
if [ -f "prisma/seeds/seed_dqp.sql" ]; then
  run_sql "prisma/seeds/seed_dqp.sql" "DQP alerts and monitoring data"
fi

# 4. Market Data (if available)
if [ -f "prisma/seeds/seed_market.sql" ]; then
  run_sql "prisma/seeds/seed_market.sql" "Market prices and TVL data"
fi

# 5. Agent Rules and Limits
if [ -f "prisma/seeds/seed_rules.sql" ]; then
  run_sql "prisma/seeds/seed_rules.sql" "Agent rules and guardrails"
fi

echo "🎯 Seeding Summary:"
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "
    SELECT 
      'roles' as table_name, COUNT(*) as count FROM roles
    UNION ALL
    SELECT 'users', COUNT(*) FROM users  
    UNION ALL
    SELECT 'api_keys', COUNT(*) FROM api_keys
    UNION ALL
    SELECT 'opportunities', COUNT(*) FROM opportunities
    UNION ALL
    SELECT 'alerts', COUNT(*) FROM alerts
    ORDER BY table_name;
  "
else
  PGPASSWORD=postgres psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    SELECT 
      'roles' as table_name, COUNT(*) as count FROM roles
    UNION ALL
    SELECT 'users', COUNT(*) FROM users  
    UNION ALL
    SELECT 'api_keys', COUNT(*) FROM api_keys
    UNION ALL
    SELECT 'opportunities', COUNT(*) FROM opportunities
    UNION ALL
    SELECT 'alerts', COUNT(*) FROM alerts
    ORDER BY table_name;
  "
fi

echo
echo "✅ All seed data loaded successfully!"
echo "🔑 Test API keys available:"
echo "   Admin:   ak_admin_test_123456789"  
echo "   Analyst: ak_analyst_test_123456789"
echo "   Viewer:  ak_viewer_test_123456789"