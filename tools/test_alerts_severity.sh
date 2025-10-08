#!/usr/bin/env bash
set -e
BASE="${BASE:-http://localhost:3005}"
echo "[high]"; curl -s "$BASE/api/read/alerts?severity=high&limit=1" | jq '.[0] // "none"'
echo "[med]";  curl -s "$BASE/api/read/alerts?severity=med&limit=1"  | jq '.[0] // "none"'
echo "[low]";  curl -s "$BASE/api/read/alerts?severity=low&limit=1"  | jq '.[0] // "none"'
