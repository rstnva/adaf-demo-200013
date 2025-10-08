#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
echo "[tick once]"
curl -s -X POST "$BASE/api/agents/process" | jq -r '.'
echo "[metrics]"
curl -s "$BASE/api/metrics" | head -n 20
echo "[kpi nav]"
curl -s "$BASE/api/read/kpi/nav" | jq -r '.'
echo "[alerts 7d]"
curl -s "$BASE/api/read/kpi/alerts7d" | jq -r '.'
