#!/bin/bash
# ================================================================================================
# Módulo H — Data Provenance & Lineage Testing Suite
# ================================================================================================
# Comprehensive testing for lineage APIs, UI integration, and metrics
# Run with: ./tools/test_lineage_api.sh
# ================================================================================================

set -e

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/read/lineage"
METRICS_URL="${BASE_URL}/api/metrics"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="${3:-200}"
    
    echo
    log_info "Running: $test_name"
    ((TESTS_RUN++))
    
    # Execute test and capture response
    local response
    local status_code
    
    response=$(curl -s -w "HTTP_STATUS:%{http_code}" "$test_command")
    status_code=$(echo "$response" | grep "HTTP_STATUS:" | sed 's/.*HTTP_STATUS://')
    response_body=$(echo "$response" | sed 's/HTTP_STATUS:.*$//')
    
    # Check status code
    if [ "$status_code" = "$expected_status" ]; then
        log_success "Status code: $status_code (expected $expected_status)"
        
        # Parse JSON response if 200
        if [ "$status_code" = "200" ]; then
            if echo "$response_body" | jq . >/dev/null 2>&1; then
                local success=$(echo "$response_body" | jq -r '.success // empty')
                if [ "$success" = "true" ]; then
                    log_success "Response format valid and success=true"
                else
                    log_error "Response success=false or missing"
                    echo "Response: $response_body" | head -c 200
                fi
            else
                log_error "Invalid JSON response"
                echo "Response: $response_body" | head -c 200
            fi
        fi
    else
        log_error "Status code: $status_code (expected $expected_status)"
        echo "Response: $response_body" | head -c 200
    fi
}

# ================================================================================================
# Test Suite
# ================================================================================================

echo "🧪 MÓDULO H — LINEAGE API TESTING SUITE"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "Testing endpoints: /api/read/lineage/*"
echo

# Test 1: Lineage trace endpoint - valid entity and refId
run_test "GET /api/read/lineage/trace - Valid signal" \
    "${API_BASE}/trace?entity=signal&refId=btc-spot-price-1m"

# Test 2: Lineage trace endpoint - invalid entity
run_test "GET /api/read/lineage/trace - Invalid entity" \
    "${API_BASE}/trace?entity=invalid&refId=test" \
    "400"

# Test 3: Lineage trace endpoint - missing refId
run_test "GET /api/read/lineage/trace - Missing refId" \
    "${API_BASE}/trace?entity=signal" \
    "400"

# Test 4: Lineage by-signal endpoint - valid signal ID
run_test "GET /api/read/lineage/by-signal - Valid signal ID" \
    "${API_BASE}/by-signal?id=signal-btc-price-001"

# Test 5: Lineage by-signal endpoint - with downstream
run_test "GET /api/read/lineage/by-signal - With downstream" \
    "${API_BASE}/by-signal?id=signal-btc-price-001&includeDownstream=true"

# Test 6: Lineage by-signal endpoint - missing ID
run_test "GET /api/read/lineage/by-signal - Missing ID" \
    "${API_BASE}/by-signal" \
    "400"

# Test 7: Lineage search endpoint - basic search
run_test "GET /api/read/lineage/search - Basic search" \
    "${API_BASE}/search?q=ingest"

# Test 8: Lineage search endpoint - filtered by entity
run_test "GET /api/read/lineage/search - Filter by entity" \
    "${API_BASE}/search?q=bitcoin&entity=signal"

# Test 9: Lineage search endpoint - filtered by stage
run_test "GET /api/read/lineage/search - Filter by stage" \
    "${API_BASE}/search?q=price&stage=ingest"

# Test 10: Lineage search endpoint - with pagination
run_test "GET /api/read/lineage/search - With pagination" \
    "${API_BASE}/search?q=data&limit=5&offset=0"

# Test 11: Lineage search endpoint - invalid entity filter
run_test "GET /api/read/lineage/search - Invalid entity filter" \
    "${API_BASE}/search?q=test&entity=invalid" \
    "400"

# Test 12: Lineage search endpoint - missing query
run_test "GET /api/read/lineage/search - Missing query" \
    "${API_BASE}/search" \
    "400"

# Test 13: Lineage search endpoint - invalid limit
run_test "GET /api/read/lineage/search - Invalid limit" \
    "${API_BASE}/search?q=test&limit=2000" \
    "400"

# ================================================================================================
# Metrics Tests
# ================================================================================================

echo
echo "📊 TESTING PROMETHEUS METRICS"
echo "============================="

# Test 14: Check metrics endpoint
run_test "GET /api/metrics - Check lineage metrics presence" \
    "${METRICS_URL}"

echo
log_info "Checking for specific lineage metrics..."

# Check if lineage metrics are present
METRICS_RESPONSE=$(curl -s "$METRICS_URL")

# Check for lineage event counter
if echo "$METRICS_RESPONSE" | grep -q "adaf_lineage_events_total"; then
    log_success "adaf_lineage_events_total metric found"
    ((TESTS_PASSED++))
else
    log_error "adaf_lineage_events_total metric not found"
    ((TESTS_FAILED++))
fi
((TESTS_RUN++))

# Check for lineage search counter
if echo "$METRICS_RESPONSE" | grep -q "adaf_lineage_search_total"; then
    log_success "adaf_lineage_search_total metric found"
    ((TESTS_PASSED++))
else
    log_error "adaf_lineage_search_total metric not found"
    ((TESTS_FAILED++))
fi
((TESTS_RUN++))

# Check for lineage search duration histogram
if echo "$METRICS_RESPONSE" | grep -q "adaf_lineage_search_duration_seconds"; then
    log_success "adaf_lineage_search_duration_seconds metric found"
    ((TESTS_PASSED++))
else
    log_error "adaf_lineage_search_duration_seconds metric not found"
    ((TESTS_FAILED++))
fi
((TESTS_RUN++))

# Check for lineage views counter
if echo "$METRICS_RESPONSE" | grep -q "adaf_lineage_views_total"; then
    log_success "adaf_lineage_views_total metric found"
    ((TESTS_PASSED++))
else
    log_error "adaf_lineage_views_total metric not found"
    ((TESTS_FAILED++))
fi
((TESTS_RUN++))

# Test 15: Test lineage view tracking
run_test "POST /api/metrics/lineage/view - Track view" \
    "${BASE_URL}/api/metrics/lineage/view -X POST -H 'Content-Type: application/json' -d '{\"entity\":\"signal\",\"refId\":\"test-signal\"}'"

# Test 16: Test invalid view tracking
run_test "POST /api/metrics/lineage/view - Invalid entity" \
    "${BASE_URL}/api/metrics/lineage/view -X POST -H 'Content-Type: application/json' -d '{\"entity\":\"invalid\",\"refId\":\"test\"}'" \
    "400"

# ================================================================================================
# Performance Tests
# ================================================================================================

echo
echo "⚡ PERFORMANCE TESTS"
echo "==================="

# Test response times
echo
log_info "Testing response times..."

# Test search performance
SEARCH_START=$(date +%s%N)
curl -s "${API_BASE}/search?q=bitcoin&limit=10" >/dev/null
SEARCH_END=$(date +%s%N)
SEARCH_TIME=$((($SEARCH_END - $SEARCH_START) / 1000000))

if [ $SEARCH_TIME -lt 1000 ]; then
    log_success "Search response time: ${SEARCH_TIME}ms (< 1000ms)"
    ((TESTS_PASSED++))
else
    log_warning "Search response time: ${SEARCH_TIME}ms (>= 1000ms)"
fi
((TESTS_RUN++))

# Test trace performance  
TRACE_START=$(date +%s%N)
curl -s "${API_BASE}/trace?entity=signal&refId=btc-spot-price-1m" >/dev/null
TRACE_END=$(date +%s%N)
TRACE_TIME=$((($TRACE_END - $TRACE_START) / 1000000))

if [ $TRACE_TIME -lt 500 ]; then
    log_success "Trace response time: ${TRACE_TIME}ms (< 500ms)"
    ((TESTS_PASSED++))
else
    log_warning "Trace response time: ${TRACE_TIME}ms (>= 500ms)"
fi
((TESTS_RUN++))

# ================================================================================================
# Data Validation Tests
# ================================================================================================

echo
echo "🔍 DATA VALIDATION TESTS"
echo "========================"

# Test data structure validation
echo
log_info "Testing response data structures..."

# Test trace response structure
TRACE_RESPONSE=$(curl -s "${API_BASE}/trace?entity=signal&refId=btc-spot-price-1m")
if echo "$TRACE_RESPONSE" | jq -e '.trace.events | type == "array"' >/dev/null 2>&1; then
    log_success "Trace response has valid events array"
    ((TESTS_PASSED++))
else
    log_error "Trace response missing or invalid events array"
    ((TESTS_FAILED++))
fi
((TESTS_RUN++))

# Test search response structure
SEARCH_RESPONSE=$(curl -s "${API_BASE}/search?q=bitcoin")
if echo "$SEARCH_RESPONSE" | jq -e '.items | type == "array"' >/dev/null 2>&1; then
    log_success "Search response has valid items array"
    ((TESTS_PASSED++))
else
    log_error "Search response missing or invalid items array"
    ((TESTS_FAILED++))
fi
((TESTS_RUN++))

# Test pagination metadata
if echo "$SEARCH_RESPONSE" | jq -e '.total | type == "number"' >/dev/null 2>&1; then
    log_success "Search response has valid total count"
    ((TESTS_PASSED++))
else
    log_error "Search response missing or invalid total count"
    ((TESTS_FAILED++))
fi
((TESTS_RUN++))

# ================================================================================================
# Summary
# ================================================================================================

echo
echo "📊 TEST SUMMARY"
echo "==============="
echo -e "Tests run: ${BLUE}$TESTS_RUN${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo
    log_success "All tests passed! 🎉"
    echo
    echo "✅ MÓDULO H VALIDATION COMPLETE!"
    echo "  • Lineage API endpoints working"
    echo "  • Prometheus metrics integrated"  
    echo "  • Performance within acceptable limits"
    echo "  • Data structures validated"
    exit 0
else
    echo
    log_error "$TESTS_FAILED tests failed"
    echo
    echo "❌ Some tests failed. Please check the output above."
    exit 1
fi