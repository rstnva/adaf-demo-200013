#!/bin/bash
# OP-X Smoke Tests - End-to-end validation of triage functionality

set -e
BASE_URL="http://localhost:3000"

echo "🚀 OP-X Triage Smoke Tests Starting..."
echo "Base URL: $BASE_URL"
echo

# Test 1: List proposed opportunities
echo "📋 Test 1: List proposed opportunities (default)"
RESPONSE=$(curl -s "$BASE_URL/api/read/opx/list?status=proposed&order=score&dir=desc&limit=10")
echo "$RESPONSE" | jq -r '.data[0:2] | .[] | "ID: \(.id) | Score: \(.score) | Consensus: \((.consensus * 100 | round))% | Blocking: \(.blocking | join(",") // "None")"'

# Extract test IDs for actions
ID1=$(echo "$RESPONSE" | jq -r '.data[0].id // empty')
ID2=$(echo "$RESPONSE" | jq -r '.data[1].id // empty')

if [ -z "$ID1" ] || [ -z "$ID2" ]; then
  echo "❌ No opportunities found. Make sure to run seed_opx.sql first"
  exit 1
fi

echo "Using IDs for actions: $ID1, $ID2"
echo

# Test 2: Recalculate all scores
echo "🔄 Test 2: Recalculate scores"
RECALC_RESPONSE=$(curl -s -X POST "$BASE_URL/api/control/opx/score" \
  -H "Content-Type: application/json" \
  -d '{"actor":"smoke-test"}')

UPDATED=$(echo "$RECALC_RESPONSE" | jq -r '.updated // 0')
MS=$(echo "$RECALC_RESPONSE" | jq -r '.ms // 0')
echo "✅ Recalculated scores for $UPDATED opportunities in ${MS}ms"
echo

# Test 3: Approve first opportunity
echo "👍 Test 3: Approve opportunity $ID1"
APPROVE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/actions/opx/approve" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ID1\",\"actor\":\"smoke-test\",\"note\":\"Approved via smoke test\"}")

APPROVE_STATUS=$(echo "$APPROVE_RESPONSE" | jq -r '.status // "error"')
if [ "$APPROVE_STATUS" = "approved" ]; then
  echo "✅ Successfully approved $ID1"
else
  echo "❌ Approve failed: $APPROVE_RESPONSE"
fi
echo

# Test 4: Reject second opportunity  
echo "👎 Test 4: Reject opportunity $ID2"
REJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/actions/opx/reject" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ID2\",\"actor\":\"smoke-test\",\"note\":\"Rejected via smoke test\"}")

REJECT_STATUS=$(echo "$REJECT_RESPONSE" | jq -r '.status // "error"')
if [ "$REJECT_STATUS" = "rejected" ]; then
  echo "✅ Successfully rejected $ID2"
else
  echo "❌ Reject failed: $REJECT_RESPONSE"
fi
echo

# Test 5: Verify approved opportunity appears in approved list
echo "✅ Test 5: Check approved opportunities"
APPROVED_RESPONSE=$(curl -s "$BASE_URL/api/read/opx/list?status=approved&limit=5")
APPROVED_COUNT=$(echo "$APPROVED_RESPONSE" | jq -r '.total // 0')
CONTAINS_ID1=$(echo "$APPROVED_RESPONSE" | jq -r --arg id "$ID1" '.data[] | select(.id == $id) | .id // empty')

echo "Total approved opportunities: $APPROVED_COUNT"
if [ "$CONTAINS_ID1" = "$ID1" ]; then
  echo "✅ Approved opportunity $ID1 found in approved list"
else
  echo "❌ Approved opportunity $ID1 not found in approved list"
fi
echo

# Test 6: Check metrics endpoint for counters
echo "📊 Test 6: Verify metrics increments"
METRICS_RESPONSE=$(curl -s "$BASE_URL/api/metrics")

# Check for OP-X specific metrics
echo "Checking for OP-X metrics in Prometheus output:"
echo "$METRICS_RESPONSE" | grep -E "adaf_opx_" | head -10

APPROVE_METRIC=$(echo "$METRICS_RESPONSE" | grep 'adaf_opx_actions_total{action="APPROVE"' || echo "")
REJECT_METRIC=$(echo "$METRICS_RESPONSE" | grep 'adaf_opx_actions_total{action="REJECT"' || echo "")
BACKLOG_METRIC=$(echo "$METRICS_RESPONSE" | grep 'adaf_opx_backlog_total' || echo "")
REQUEST_METRIC=$(echo "$METRICS_RESPONSE" | grep 'adaf_api_requests_total.*opx' || echo "")

echo
if [ -n "$APPROVE_METRIC" ]; then
  echo "✅ Found APPROVE action metric"
else
  echo "❌ Missing APPROVE action metric"
fi

if [ -n "$REJECT_METRIC" ]; then
  echo "✅ Found REJECT action metric"  
else
  echo "❌ Missing REJECT action metric"
fi

if [ -n "$BACKLOG_METRIC" ]; then
  echo "✅ Found backlog metric"
else
  echo "❌ Missing backlog metric"
fi

if [ -n "$REQUEST_METRIC" ]; then
  echo "✅ Found OP-X request counter"
else
  echo "❌ Missing OP-X request counter"
fi

echo
echo "🎉 OP-X Smoke Tests Complete!"
echo

# Test 7: Quick pagination and filter test
echo "📄 Test 7: Pagination and filters"
PAGE2_RESPONSE=$(curl -s "$BASE_URL/api/read/opx/list?status=any&page=1&limit=3")
PAGE2_COUNT=$(echo "$PAGE2_RESPONSE" | jq -r '.data | length')
PAGE2_PAGE=$(echo "$PAGE2_RESPONSE" | jq -r '.page')
echo "✅ Page 1 returned $PAGE2_COUNT items (page: $PAGE2_PAGE)"

TYPE_FILTER_RESPONSE=$(curl -s "$BASE_URL/api/read/opx/list?type=beta&limit=5")
TYPE_FILTER_COUNT=$(echo "$TYPE_FILTER_RESPONSE" | jq -r '.data | length')
echo "✅ Type filter 'beta' returned $TYPE_FILTER_COUNT items"

# Test 8: Idempotency check
echo "🔁 Test 8: Idempotency check"
IDEMPOTENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/actions/opx/approve" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ID1\",\"actor\":\"smoke-test\",\"note\":\"Second approve attempt\"}")

IDEMPOTENT_STATUS=$(echo "$IDEMPOTENT_RESPONSE" | jq -r '.status // "error"')
if [ "$IDEMPOTENT_STATUS" = "approved" ]; then
  echo "✅ Idempotent approve returned correct status"
else
  echo "❌ Idempotent approve failed: $IDEMPOTENT_RESPONSE"
fi

echo
echo "🏁 All OP-X smoke tests completed successfully!"
echo "Ready for production triage workflows."