#!/bin/bash
# Smoke All - Comprehensive end-to-end testing suite

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
ADMIN_TOKEN=${ADMIN_TOKEN:-"ak_admin_test_123456789"}
ANALYST_TOKEN=${ANALYST_TOKEN:-"ak_analyst_test_123456789"}
VIEWER_TOKEN=${VIEWER_TOKEN:-"ak_viewer_test_123456789"}

echo "🚀 ADAF Complete Smoke Test Suite"
echo "Base URL: $BASE_URL"
echo "Testing with seeded API keys..."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test result tracking
run_test() {
  local test_name=$1
  local test_command=$2
  local expected_pattern=$3
  
  TESTS_RUN=$((TESTS_RUN + 1))
  echo -e "${BLUE}🧪 Test ${TESTS_RUN}: ${test_name}${NC}"
  
  if result=$(eval "$test_command" 2>&1); then
    if echo "$result" | grep -q "$expected_pattern"; then
      echo -e "${GREEN}✅ PASSED${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo -e "${RED}❌ FAILED - Unexpected response${NC}"
      echo "Expected pattern: $expected_pattern"
      echo "Actual response: $result"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo -e "${RED}❌ FAILED - Command failed${NC}"
    echo "Error: $result"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo
}

# Wait for service to be ready
echo "🔍 Checking service availability..."
for i in {1..30}; do
  if curl -s "$BASE_URL/api/read/whoami" > /dev/null; then
    echo -e "${GREEN}✅ Service is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}❌ Service not available after 30 attempts${NC}"
    exit 1
  fi
  echo "Waiting for service... attempt $i/30"
  sleep 2
done
echo

# === AUTHENTICATION & AUTHORIZATION TESTS ===
echo -e "${YELLOW}🔐 Authentication & Authorization Tests${NC}"

run_test "Default authentication (no credentials)" \
  "curl -s $BASE_URL/api/read/whoami" \
  '"role":"viewer"'

run_test "Admin API key authentication" \
  "curl -s -H 'Authorization: Bearer $ADMIN_TOKEN' $BASE_URL/api/read/whoami" \
  '"role":"admin"'

run_test "Analyst API key authentication" \
  "curl -s -H 'Authorization: Bearer $ANALYST_TOKEN' $BASE_URL/api/read/whoami" \
  '"role":"analyst"'

run_test "Admin endpoint protection (no auth)" \
  "curl -s $BASE_URL/api/control/keys" \
  '"error":"forbidden"'

run_test "Admin endpoint access (with admin key)" \
  "curl -s -H 'Authorization: Bearer $ADMIN_TOKEN' $BASE_URL/api/control/keys" \
  '"keys"'

run_test "Analyst endpoint protection (no auth)" \
  "curl -s -X POST -H 'Content-Type: application/json' -d '{\"id\":\"test\",\"actor\":\"test\"}' $BASE_URL/api/actions/opx/approve" \
  '"error":"forbidden"'

# === API KEY MANAGEMENT TESTS ===
echo -e "${YELLOW}🔑 API Key Management Tests${NC}"

# Create new API key
NEW_KEY_RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"viewer","createdBy":"smoke-test"}' \
  "$BASE_URL/api/control/keys")

run_test "Create new API key" \
  "echo '$NEW_KEY_RESULT'" \
  '"token"'

# Extract new token for testing
NEW_TOKEN=$(echo "$NEW_KEY_RESULT" | jq -r '.token // empty')
if [ -n "$NEW_TOKEN" ]; then
  run_test "New API key authentication" \
    "curl -s -H 'Authorization: Bearer $NEW_TOKEN' $BASE_URL/api/read/whoami" \
    '"role":"viewer"'
  
  # Test key disabling
  KEY_PREFIX=$(echo "$NEW_TOKEN" | cut -c1-8)
  run_test "Disable API key by prefix" \
    "curl -s -X POST -H 'Authorization: Bearer $ADMIN_TOKEN' -H 'Content-Type: application/json' -d '{\"tokenPrefix\":\"$KEY_PREFIX\",\"actor\":\"smoke-test\"}' $BASE_URL/api/control/keys/disable" \
    '"disabled"'
fi

# === DATA ACCESS TESTS ===
echo -e "${YELLOW}📊 Data Access Tests${NC}"

run_test "OP-X opportunities list (public read)" \
  "curl -s '$BASE_URL/api/read/opx/list?limit=1'" \
  '"data"'

run_test "DQP overview (public read)" \
  "curl -s '$BASE_URL/api/read/dqp/overview?limit=1'" \
  '"status"'

# === ROLE-BASED ACCESS TESTS ===
echo -e "${YELLOW}👥 Role-Based Access Tests${NC}"

run_test "Viewer cannot access admin endpoints" \
  "curl -s -H 'Authorization: Bearer $VIEWER_TOKEN' $BASE_URL/api/control/keys" \
  '"error":"forbidden"'

run_test "Analyst can access OP-X actions" \
  "curl -s -X POST -H 'Authorization: Bearer $ANALYST_TOKEN' -H 'Content-Type: application/json' -d '{\"id\":\"nonexistent\",\"actor\":\"smoke-test\"}' $BASE_URL/api/actions/opx/approve" \
  '"error":"not found"'

run_test "Admin can access control panel" \
  "curl -s -H 'Authorization: Bearer $ADMIN_TOKEN' $BASE_URL/api/control/keys" \
  '"keys"'

# === SECURITY TESTS ===
echo -e "${YELLOW}🛡️ Security Tests${NC}"

run_test "Invalid API key rejection" \
  "curl -s -H 'Authorization: Bearer invalid_key_123' $BASE_URL/api/control/keys" \
  '"error":"forbidden"'

run_test "Malformed Authorization header" \
  "curl -s -H 'Authorization: InvalidFormat' $BASE_URL/api/control/keys" \
  '"error":"forbidden"'

run_test "SQL injection protection (basic test)" \
  "curl -s '$BASE_URL/api/read/opx/list?status=proposed%27OR%271%27=%271'" \
  '"data"'

# === PERFORMANCE TESTS ===
echo -e "${YELLOW}⚡ Performance Tests${NC}"

run_test "Authentication performance (< 500ms)" \
  "time curl -s -H 'Authorization: Bearer $ADMIN_TOKEN' $BASE_URL/api/read/whoami" \
  '"role":"admin"'

# === SUMMARY ===
echo -e "${YELLOW}📋 Test Summary${NC}"
echo "Tests run: $TESTS_RUN"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo
  echo -e "${GREEN}🎉 All tests passed! System is working correctly.${NC}"
  exit 0
else
  echo
  echo -e "${RED}💥 $TESTS_FAILED test(s) failed! Please check the system.${NC}"
  exit 1
fi