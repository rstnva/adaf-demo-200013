#!/usr/bin/env bash
set -e
BASE="${BASE:-http://localhost:3005}"
url="$BASE/api/read/onchain/tvl-heatmap?days=14"
echo "GET $url"
res=$(curl -s "$url")
len=$(echo "$res" | jq 'length')
echo "rows: $len"
echo "$res" | jq '.[0]'
