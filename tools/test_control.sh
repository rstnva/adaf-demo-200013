#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://localhost:3005}

jq_bin=$(command -v jq || true)
if [ -z "$jq_bin" ]; then
  echo "[warn] 'jq' not found; output will be raw JSON"
  jq() { cat; }
fi

echo "[limits]"
curl -s "$BASE/api/control/limits" | jq '. | length as $n | "count: "+($n|tostring)'

echo "[upsert limit]"
curl -s -X POST "$BASE/api/control/limits" -H 'Content-Type: application/json' \
  -d '{"key":"LTV","value":0.34,"notes":"ajuste via UI","actor":"script"}' | jq

echo "[rules list NM-1]"
curl -s "$BASE/api/control/rules?agentCode=NM-1" | jq '.[0]'

echo "[create rule]"
curl -s -X POST "$BASE/api/control/rules" -H 'Content-Type: application/json' \
  -d '{"agentCode":"NM-1","name":"SEC keyword","expr":{"kind":"keyword","field":"news.title","anyOf":["sec"]},"actor":"script"}' | jq

sleep 0.5

echo "[audit]"
curl -s "$BASE/api/read/audit" | jq '.[0]'
