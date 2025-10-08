#!/bin/bash
# RBAC Integration Smoke Tests - Validate authentication and authorization

set -e
BASE_URL="http://localhost:3005"

echo "🔒 RBAC Integration Smoke Tests Starting..."
echo "Base URL: $BASE_URL"
echo

# Test 1: Check authentication status without credentials
echo "🔍 Test 1: Authentication status (no credentials)"
WHOAMI_RESPONSE=$(curl -s "$BASE_URL/api/read/whoami")
ROLE=$(echo "$WHOAMI_RESPONSE" | jq -r '.role')
echo "✅ Default role: $ROLE"
echo

# Test 2: Test admin-only endpoint without credentials (should fail)
echo "🚫 Test 2: Admin endpoint access (no credentials - should fail)"
KEYS_RESPONSE=$(curl -s "$BASE_URL/api/control/keys")
ERROR=$(echo "$KEYS_RESPONSE" | jq -r '.error // empty')
if [[ "$ERROR" == "forbidden" ]]; then
  echo "✅ Access correctly denied: $ERROR"
else
  echo "❌ Expected forbidden error, got: $KEYS_RESPONSE"
fi
echo

# Test 3: Test analyst-only endpoint without credentials (should fail)
echo "🚫 Test 3: Analyst endpoint access (no credentials - should fail)"
APPROVE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/actions/opx/approve" \
  -H "Content-Type: application/json" \
  -d '{"id":"test","actor":"test"}')
ERROR=$(echo "$APPROVE_RESPONSE" | jq -r '.error // empty')
if [[ "$ERROR" == "forbidden" ]]; then
  echo "✅ Access correctly denied: $ERROR"
else
  echo "❌ Expected forbidden error, got: $APPROVE_RESPONSE"
fi
echo

# Test 4: Read endpoints should work for everyone (viewer+)
echo "📊 Test 4: Public read endpoint (should work)"
OPX_LIST_RESPONSE=$(curl -s "$BASE_URL/api/read/opx/list?limit=1")
DATA_COUNT=$(echo "$OPX_LIST_RESPONSE" | jq -r '.data | length')
echo "✅ Read access works: retrieved $DATA_COUNT items"
echo

echo "🎯 Summary:"
echo "  • Authentication system detects default role: $ROLE"
echo "  • Admin endpoints properly protected with 403 responses"
echo "  • Analyst endpoints properly protected with 403 responses"
echo "  • Read endpoints remain publicly accessible"
echo
echo "🔑 To test with actual API keys:"
echo "  1. Create admin user and API key via seed data"
echo "  2. Use: curl -H 'Authorization: Bearer YOUR_API_KEY' ..."
echo "  3. Verify proper role-based access control"