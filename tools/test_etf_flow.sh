#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"

echo "[info] Using BASE=$BASE"

ts() { date -u +%FT%TZ; }

d0=$(date -u -d "today" +%F)
d1=$(date -u -d "yesterday" +%F)
d2=$(date -u -d "2 days ago" +%F)

echo "[ingest] $d2 BTC +150M"
curl -s -X POST "$BASE/api/ingest/etf/flow" -H 'Content-Type: application/json' \
 -d "{\"provider\":\"farside\",\"asset\":\"BTC\",\"date\":\"$d2\",\"netInUsd\":150000000}" | jq -r '.'

echo "[ingest] $d1 BTC +300M"
curl -s -X POST "$BASE/api/ingest/etf/flow" -H 'Content-Type: application/json' \
 -d "{\"provider\":\"farside\",\"asset\":\"BTC\",\"date\":\"$d1\",\"netInUsd\":300000000}" | jq -r '.'

echo "[ingest] $d0 BTC -50M"
curl -s -X POST "$BASE/api/ingest/etf/flow" -H 'Content-Type: application/json' \
 -d "{\"provider\":\"farside\",\"asset\":\"BTC\",\"date\":\"$d0\",\"netInUsd\":-50000000}" | jq -r '.'

echo "[read] últimos 7 días BTC"
curl -s "$BASE/api/read/etf/flow?asset=BTC&days=7" | jq -r '.'

echo "[worker] trigger manual via /api/agents/process"
curl -s -X POST "$BASE/api/agents/process" | jq -r '.'

echo "[done] $(ts)"