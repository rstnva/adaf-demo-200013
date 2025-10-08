#!/usr/bin/env bash
set -euo pipefail
URL=${URL:-http://localhost:3000}

# GET checklist
echo "-- GET checklist"
resp=$(curl -sS "$URL/api/read/compliance/checklist")
count=$(echo "$resp" | jq '.items | length')
echo "items: $count"; if [ "$count" -lt 6 ]; then echo "Expected >=6"; exit 1; fi

# POST upsert
echo "-- POST upsert"
out=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"item":{"key":"ofac.screening","status":"warn"},"actor":"ui"}' \
  "$URL/api/control/compliance/checklist")
echo "$out" | jq .

# GET audit
echo "-- GET audit?entity=Compliance"
curl -sS "$URL/api/read/audit?entity=Compliance&limit=5" | jq .
