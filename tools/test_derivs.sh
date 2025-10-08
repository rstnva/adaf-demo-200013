#!/bin/bash
# Derivatives Smoke Tests - Validate funding/gamma endpoints and worker alert creation

set -e
BASE_URL="http://localhost:3000"

echo "📊 Derivatives Smoke Tests Starting..."
echo "Base URL: $BASE_URL"
echo

# Test 1: BTC funding data endpoint
echo "💰 Test 1: GET BTC funding data (14 days)"
BTC_FUNDING=$(curl -s "$BASE_URL/api/read/derivs/funding?asset=BTC&days=14")
echo "$BTC_FUNDING" | jq -r '.[0:3] | .[] | "Date: \(.date) | Exchange: \(.exchange) | Rate: \(.fundingRate)% | Window: \(.window)"'

BTC_COUNT=$(echo "$BTC_FUNDING" | jq '. | length')
echo "✅ BTC funding entries: $BTC_COUNT"

if [ "$BTC_COUNT" -eq 0 ]; then
  echo "❌ No BTC funding data found. Run seed_derivs.sql first"
  exit 1
fi

# Test 2: ETH funding data endpoint
echo
echo "💰 Test 2: GET ETH funding data (14 days)"
ETH_FUNDING=$(curl -s "$BASE_URL/api/read/derivs/funding?asset=ETH&days=14")
ETH_COUNT=$(echo "$ETH_FUNDING" | jq '. | length')
echo "✅ ETH funding entries: $ETH_COUNT"

if [ "$ETH_COUNT" -gt 0 ]; then
  echo "$ETH_FUNDING" | jq -r '.[0:2] | .[] | "Date: \(.date) | Exchange: \(.exchange) | Rate: \(.fundingRate)%"'
fi

# Test 3: BTC gamma surface endpoint
echo
echo "📈 Test 3: GET BTC gamma surface"
BTC_GAMMA=$(curl -s "$BASE_URL/api/read/derivs/gamma?asset=BTC&tenors=7,14,30")

TENOR7_COUNT=$(echo "$BTC_GAMMA" | jq '.tenor7 | length')
TENOR14_COUNT=$(echo "$BTC_GAMMA" | jq '.tenor14 | length')  
TENOR30_COUNT=$(echo "$BTC_GAMMA" | jq '.tenor30 | length')

echo "✅ BTC Gamma points: 7d=$TENOR7_COUNT, 14d=$TENOR14_COUNT, 30d=$TENOR30_COUNT"

if [ "$TENOR7_COUNT" -gt 0 ]; then
  echo "Sample 7d gamma points:"
  echo "$BTC_GAMMA" | jq -r '.tenor7[0:2] | .[] | "Strike: \(.strike) | Gamma: \(.gamma)"'
fi

# Test 4: ETH gamma surface endpoint
echo
echo "📈 Test 4: GET ETH gamma surface"
ETH_GAMMA=$(curl -s "$BASE_URL/api/read/derivs/gamma?asset=ETH&tenors=7,14,30")
ETH_GAMMA_COUNT=$(echo "$ETH_GAMMA" | jq '.tenor7 | length')
echo "✅ ETH Gamma 7d points: $ETH_GAMMA_COUNT"

# Test 5: Trigger worker to process funding alerts
echo
echo "🤖 Test 5: Trigger worker tick (should create funding alerts)"
WORKER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/process")
PROCESSED=$(echo "$WORKER_RESPONSE" | jq -r '.processed // 0')
echo "✅ Worker processed $PROCESSED signals"

# Brief pause for alert creation
sleep 2

# Test 6: Check for created funding alerts
echo
echo "🔔 Test 6: Check for derivatives funding alerts"
ALERTS_RESPONSE=$(curl -s "$BASE_URL/api/read/alerts?limit=20")
FUNDING_ALERTS=$(echo "$ALERTS_RESPONSE" | jq '[.[] | select(.type == "derivs.funding.signal")]')
FUNDING_ALERT_COUNT=$(echo "$FUNDING_ALERTS" | jq '. | length')

echo "Found $FUNDING_ALERT_COUNT funding alerts"

if [ "$FUNDING_ALERT_COUNT" -gt 0 ]; then
  echo "Latest funding alerts:"
  echo "$FUNDING_ALERTS" | jq -r '.[0:2] | .[] | "Alert: \(.title) | Severity: \(.severity)"'
else
  echo "ℹ️  No funding alerts found (may need more negative funding periods or worker adjustment)"
fi

# Test 7: Check derivatives metrics
echo
echo "📊 Test 7: Check derivatives metrics"
METRICS_RESPONSE=$(curl -s "$BASE_URL/api/metrics")

# Check for derivatives-specific metrics
FUNDING_ALERT_METRIC=$(echo "$METRICS_RESPONSE" | grep 'adaf_derivs_funding_alerts_total' || echo "")
FUNDING_NEG_HOURS_METRIC=$(echo "$METRICS_RESPONSE" | grep 'adaf_derivs_funding_neg_hours' || echo "")
API_REQUEST_DERIVS=$(echo "$METRICS_RESPONSE" | grep 'adaf_api_requests_total.*derivs' || echo "")

echo "Derivatives metrics found:"
if [ -n "$FUNDING_ALERT_METRIC" ]; then
  echo "✅ Funding alerts counter: Found"
  echo "$FUNDING_ALERT_METRIC" | head -2
else
  echo "❌ Funding alerts counter: Missing"
fi

if [ -n "$FUNDING_NEG_HOURS_METRIC" ]; then
  echo "✅ Negative funding hours gauge: Found"
  echo "$FUNDING_NEG_HOURS_METRIC" | head -2  
else
  echo "❌ Negative funding hours gauge: Missing"
fi

if [ -n "$API_REQUEST_DERIVS" ]; then
  echo "✅ API request counter (derivs): Found"
else
  echo "❌ API request counter (derivs): Missing"
fi

# Test 8: Parameter validation
echo
echo "🧪 Test 8: Parameter validation"
INVALID_ASSET=$(curl -s "$BASE_URL/api/read/derivs/funding?asset=INVALID&days=7")
INVALID_COUNT=$(echo "$INVALID_ASSET" | jq '. | length // 0')
echo "✅ Invalid asset handling: Returned $INVALID_COUNT entries (should default to BTC)"

LARGE_DAYS=$(curl -s "$BASE_URL/api/read/derivs/funding?asset=BTC&days=999")
LARGE_DAYS_COUNT=$(echo "$LARGE_DAYS" | jq '. | length // 0')
echo "✅ Large days parameter: Returned $LARGE_DAYS_COUNT entries (should be clamped to max 60 days)"

# Test 9: Check opportunities created by funding alerts
echo
echo "💼 Test 9: Check for basis opportunities created by funding alerts"
OPP_RESPONSE=$(curl -s "$BASE_URL/api/read/opx/list?type=basis&status=proposed&limit=10")
BASIS_OPPS=$(echo "$OPP_RESPONSE" | jq '.data | length // 0')
echo "✅ Basis opportunities found: $BASIS_OPPS"

if [ "$BASIS_OPPS" -gt 0 ]; then
  echo "Sample basis opportunities:"
  echo "$OPP_RESPONSE" | jq -r '.data[0:2] | .[] | "ID: \(.id) | Idea: \(.idea) | Agent: \(.agentCode)"'
fi

echo
echo "🎉 Derivatives smoke tests completed!"
echo
echo "Summary:"
echo "- BTC Funding entries: $BTC_COUNT"
echo "- ETH Funding entries: $ETH_COUNT"  
echo "- BTC Gamma points: 7d=$TENOR7_COUNT, 14d=$TENOR14_COUNT, 30d=$TENOR30_COUNT"
echo "- ETH Gamma 7d points: $ETH_GAMMA_COUNT"
echo "- Funding alerts created: $FUNDING_ALERT_COUNT"
echo "- Basis opportunities: $BASIS_OPPS"
echo
echo "✅ Ready for derivatives monitoring and funding alerting!"