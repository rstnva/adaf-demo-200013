#!/bin/bash

# DQP (Data Quality & Pipeline Health) Smoke Tests
# Tests all DQP endpoints and validates responses

set -e

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Starting DQP Smoke Tests..."
echo "Base URL: $BASE_URL"
echo

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$url" || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$url" || echo -e "\n000")
    fi
    
    # Extract status code (last line) and body (everything else)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        echo -e "${RED}Response body: $body${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper function to validate JSON response
validate_json_field() {
    local name="$1"
    local json_data="$2"
    local field="$3"
    local expected_type="$4"
    
    echo -n "  Validating $name field '$field'... "
    
    # Check if field exists and has correct type
    if echo "$json_data" | jq -e ".$field" > /dev/null 2>&1; then
        field_type=$(echo "$json_data" | jq -r ".$field | type")
        if [ "$field_type" = "$expected_type" ] || [ "$expected_type" = "any" ]; then
            echo -e "${GREEN}✓${NC}"
            return 0
        else
            echo -e "${RED}✗ (Expected type: $expected_type, Got: $field_type)${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ (Field not found)${NC}"
        return 1
    fi
}

echo "📊 Testing DQP Overview Endpoint"
echo "================================"

# Test 1: Get overview with all data
echo -n "GET /api/read/dqp/overview (all data)... "
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/read/dqp/overview?status=any&limit=200" || echo -e "\n000")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Validate response structure
    validate_json_field "overview" "$body" "rows" "array"
    validate_json_field "overview" "$body" "generatedAt" "string"
    
    # Count and display results by status
    row_count=$(echo "$body" | jq '.rows | length')
    ok_count=$(echo "$body" | jq '[.rows[] | select(.status == "ok")] | length')
    warn_count=$(echo "$body" | jq '[.rows[] | select(.status == "warn")] | length')
    fail_count=$(echo "$body" | jq '[.rows[] | select(.status == "fail")] | length')
    
    echo "  📈 Results: $row_count total rows"
    echo -e "    ${GREEN}OK: $ok_count${NC}, ${YELLOW}WARN: $warn_count${NC}, ${RED}FAIL: $fail_count${NC}"
    
    # Display first 3 rows as examples
    echo "  📝 Example rows:"
    echo "$body" | jq -r '.rows[0:3][] | "    \(.source) | \(.agentCode) | \(.type) | \(.status)"' 2>/dev/null || echo "    (No data to display)"
else
    echo -e "${RED}✗ FAIL${NC} (Expected: 200, Got: $status_code)"
    echo -e "${RED}Response: $body${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2: Filter by status
test_endpoint "overview filter by status=fail" "GET" "/api/read/dqp/overview?status=fail&limit=50" "" "200"

# Test 3: Filter by agent
test_endpoint "overview filter by agent=NM" "GET" "/api/read/dqp/overview?agent=NM&limit=50" "" "200"

# Test 4: Filter by source
test_endpoint "overview filter by source=defillama" "GET" "/api/read/dqp/overview?source=defillama&limit=50" "" "200"

echo
echo "🚨 Testing DQP Incidents Endpoint"
echo "================================="

# Test 5: Get all incidents
echo -n "GET /api/read/dqp/incidents (all incidents)... "
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/read/dqp/incidents?limit=10" || echo -e "\n000")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Validate response structure
    validate_json_field "incidents" "$body" "items" "array"
    validate_json_field "incidents" "$body" "generatedAt" "string"
    
    # Count and display results by kind and ack status
    item_count=$(echo "$body" | jq '.items | length')
    ack_count=$(echo "$body" | jq '[.items[] | select(.acknowledged == true)] | length')
    unack_count=$(echo "$body" | jq '[.items[] | select(.acknowledged == false)] | length')
    
    echo "  📈 Results: $item_count incidents"
    echo -e "    ${GREEN}Acknowledged: $ack_count${NC}, ${YELLOW}Unacknowledged: $unack_count${NC}"
    
    # Display kinds
    echo "  📝 Incident kinds:"
    echo "$body" | jq -r '.items[] | .kind' | sort | uniq -c | while read count kind; do
        echo "    $kind: $count"
    done
else
    echo -e "${RED}✗ FAIL${NC} (Expected: 200, Got: $status_code)"
    echo -e "${RED}Response: $body${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 6: Filter incidents by kind
test_endpoint "incidents filter by kind=freshness" "GET" "/api/read/dqp/incidents?kind=freshness&limit=5" "" "200"

# Test 7: Filter incidents by ack status
test_endpoint "incidents filter by ack=0" "GET" "/api/read/dqp/incidents?ack=0&limit=5" "" "200"

echo
echo "⚡ Testing DQP Action Endpoints"
echo "==============================="

# Test 8: Retry request
echo -n "POST /api/actions/dqp/retry... "
retry_data='{"source": "defillama", "agentCode": "OC-1", "type": "onchain.tvl.point", "actor": "test_script"}'
response=$(curl -s -w "\n%{http_code}" -X "POST" -H "Content-Type: application/json" -d "$retry_data" "$BASE_URL/api/actions/dqp/retry" || echo -e "\n000")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Validate response
    validate_json_field "retry" "$body" "ok" "boolean"
    validate_json_field "retry" "$body" "queued" "boolean"
    
    queued=$(echo "$body" | jq -r '.queued')
    echo "  📋 Retry queued: $queued"
else
    echo -e "${RED}✗ FAIL${NC} (Expected: 200, Got: $status_code)"
    echo -e "${RED}Response: $body${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 9: Get an incident ID for acknowledgment test
echo -n "Getting incident ID for ACK test... "
incidents_response=$(curl -s "$BASE_URL/api/read/dqp/incidents?ack=0&limit=1" 2>/dev/null)
incident_id=$(echo "$incidents_response" | jq -r '.items[0].id // empty' 2>/dev/null)

if [ -n "$incident_id" ] && [ "$incident_id" != "null" ]; then
    echo -e "${GREEN}✓${NC} (ID: $incident_id)"
    
    # Test 10: Acknowledge incident
    echo -n "POST /api/actions/dqp/ack... "
    ack_data="{\"id\": \"$incident_id\", \"actor\": \"test_script\"}"
    response=$(curl -s -w "\n%{http_code}" -X "POST" -H "Content-Type: application/json" -d "$ack_data" "$BASE_URL/api/actions/dqp/ack" || echo -e "\n000")
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        validate_json_field "ack" "$body" "ok" "boolean"
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: 200, Got: $status_code)"
        echo -e "${RED}Response: $body${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} (No unacknowledged incidents found)"
    echo "  Creating mock ACK test..."
    # Test with a fake ID to ensure error handling works
    test_endpoint "ack with invalid ID" "POST" "/api/actions/dqp/ack" '{"id": "fake-id", "actor": "test_script"}' "404"
fi

echo
echo "📁 Testing DQP CSV Export"
echo "========================="

# Test 11: CSV export
echo -n "GET /api/read/dqp/overview.csv... "
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/read/dqp/overview.csv?status=any&limit=100" || echo -e "\n000")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Validate CSV headers
    headers=$(echo "$body" | head -n1)
    expected_headers="source,agentCode,type,lastTs,freshnessMin,lastCount24h,dupes24h,schemaErrors24h,status,notes"
    
    if [ "$headers" = "$expected_headers" ]; then
        echo "  📋 CSV headers: ✓ Valid"
    else
        echo -e "  📋 CSV headers: ${RED}✗ Invalid${NC}"
        echo "    Expected: $expected_headers"
        echo "    Got: $headers"
    fi
    
    # Count rows
    csv_rows=$(echo "$body" | wc -l)
    data_rows=$((csv_rows - 1))
    echo "  📊 CSV data rows: $data_rows"
    
    # Show first data row as example
    if [ $data_rows -gt 0 ]; then
        echo "  📝 Example row:"
        echo "$body" | head -n2 | tail -n1 | sed 's/^/    /'
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Expected: 200, Got: $status_code)"
    echo -e "${RED}Response: $body${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo
echo "📊 Testing DQP Metrics Integration"
echo "=================================="

# Test 12: Metrics endpoint contains DQP metrics
echo -n "GET /api/metrics (DQP metrics check)... "
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/metrics" || echo -e "\n000")
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check for DQP-specific metrics
    dqp_incidents=$(echo "$body" | grep -c "adaf_dqp_incidents_total" || echo "0")
    dqp_sources=$(echo "$body" | grep -c "adaf_dqp_sources_status" || echo "0")
    dqp_freshness=$(echo "$body" | grep -c "adaf_dqp_last_freshness_minutes" || echo "0")
    api_requests=$(echo "$body" | grep -c "adaf_api_requests_total.*dqp" || echo "0")
    
    echo "  📈 DQP Metrics found:"
    echo "    adaf_dqp_incidents_total: $dqp_incidents"
    echo "    adaf_dqp_sources_status: $dqp_sources" 
    echo "    adaf_dqp_last_freshness_minutes: $dqp_freshness"
    echo "    DQP API requests: $api_requests"
    
    if [ $dqp_incidents -gt 0 ] && [ $dqp_sources -gt 0 ]; then
        echo -e "  ${GREEN}✓ DQP metrics properly exposed${NC}"
    else
        echo -e "  ${YELLOW}⚠ Some DQP metrics missing (expected after first requests)${NC}"
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Expected: 200, Got: $status_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo
echo "🔍 Testing Edge Cases & Error Handling"
echo "======================================"

# Test 13: Invalid parameters
test_endpoint "overview with invalid status" "GET" "/api/read/dqp/overview?status=invalid" "" "200"
test_endpoint "overview with invalid agent" "GET" "/api/read/dqp/overview?agent=INVALID" "" "200"
test_endpoint "overview with very high limit" "GET" "/api/read/dqp/overview?limit=9999" "" "200"

# Test 14: Malformed requests
test_endpoint "retry with missing fields" "POST" "/api/actions/dqp/retry" '{"source": "test"}' "400"
test_endpoint "ack with missing fields" "POST" "/api/actions/dqp/ack" '{"id": ""}' "400"

# Test 15: Actor field validation
test_endpoint "retry with long actor" "POST" "/api/actions/dqp/retry" "{\"source\": \"test\", \"agentCode\": \"TEST\", \"actor\": \"$(printf '%*s' 150 '' | tr ' ' 'x')\"}" "400"

echo
echo "📋 Test Summary"
echo "==============="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All DQP smoke tests passed!${NC}"
    exit 0
else
    echo -e "\n❌ ${RED}Some tests failed. Check the output above.${NC}"
    exit 1
fi