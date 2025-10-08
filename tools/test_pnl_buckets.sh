#!/usr/bin/env bash
set -euo pipefail

URL=${URL:-http://localhost:3000}
DAYS=${1:-14}

resp=$(curl -sS "$URL/api/read/kpi/pnl-buckets?days=$DAYS")
summary_count=$(echo "$resp" | jq '.summary | length')
daily_count=$(echo "$resp" | jq '.daily | length')
echo "summary buckets: $summary_count, daily points: $daily_count"
echo "$resp" | jq '.daily[:2], .summary'