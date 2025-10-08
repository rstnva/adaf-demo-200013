#!/usr/bin/env bash
set -euo pipefail
URL=${URL:-http://localhost:3000}

echo "-- /api/read/risk/var?window=1d"
curl -sS "$URL/api/read/risk/var?window=1d" | jq .

echo "-- /api/read/risk/var?window=7d"
curl -sS "$URL/api/read/risk/var?window=7d" | jq .

echo "-- /api/read/risk/dd?days=90 (first 3)"
curl -sS "$URL/api/read/risk/dd?days=90" | jq '.[0:3]'

echo "-- /api/read/risk/dd?days=90 (last 3)"
curl -sS "$URL/api/read/risk/dd?days=90" | jq '.[-3:]'
