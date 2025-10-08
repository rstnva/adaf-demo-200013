#!/usr/bin/env bash
set -e
BASE="${BASE:-http://localhost:3005}"
echo "[read open]"
curl -s "$BASE/api/read/alerts?open=1&limit=5" | jq '.[0]'
echo "[ack first id if any]"
id=$(curl -s "$BASE/api/read/alerts?open=1&limit=1" | jq -r '.[0]?.id // empty')
if [ -n "$id" ]; then curl -s -X POST "$BASE/api/actions/alerts/$id/ack" | jq ; fi
echo "[read ack]"
curl -s "$BASE/api/read/alerts?open=0&limit=5" | jq '.[0]'
