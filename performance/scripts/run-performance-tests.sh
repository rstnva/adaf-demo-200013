#!/bin/bash

# ADAF Dashboard Performance Testing Suite
# Automated test execution and reporting script
#
# Usage:
#   ./run-performance-tests.sh [test-type] [options]
#
# Test Types:
#   load      - Normal traffic load testing
#   stress    - Stress testing beyond normal capacity
#   spike     - Sudden traffic spike simulation
#   endurance - Extended duration load testing
#   all       - Run all test types sequentially
#
# Options:
#   --base-url URL    - Target application URL (default: http://localhost:3000)
#   --duration TIME   - Override test duration (e.g., 5m, 30s)
#   --vus NUMBER      - Override virtual users count
#   --output DIR      - Output directory for reports (default: ./results)
#   --tag NAME        - Tag for this test run
#   --no-report       - Skip HTML report generation
#   --slack-webhook   - Slack webhook URL for notifications

set -euo pipefail

# Default configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
OUTPUT_DIR="./results/$(date +%Y%m%d_%H%M%S)"
TEST_TAG="${TEST_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')}"
K6_VERSION="0.47.0"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
GENERATE_REPORT=true
PARALLEL_TESTS=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

error() {
    log "${RED}ERROR: $1${NC}"
}

success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

info() {
    log "${BLUE}INFO: $1${NC}"
}

warn() {
    log "${YELLOW}WARNING: $1${NC}"
}

# Help function
show_help() {
    cat << EOF
ADAF Dashboard Performance Testing Suite

Usage: $0 [test-type] [options]

Test Types:
    load        Normal traffic load testing (default)
    stress      Stress testing beyond normal capacity  
    spike       Sudden traffic spike simulation
    endurance   Extended duration load testing
    all         Run all test types sequentially

Options:
    --base-url URL      Target application URL (default: $BASE_URL)
    --duration TIME     Override test duration (e.g., 5m, 30s)
    --vus NUMBER        Override virtual users count
    --output DIR        Output directory for reports (default: auto-generated)
    --tag NAME          Tag for this test run (default: git commit hash)
    --no-report         Skip HTML report generation
    --slack-webhook URL Slack webhook URL for notifications
    --parallel          Run multiple test types in parallel
    -h, --help          Show this help message

Examples:
    # Basic load test
    $0 load
    
    # Stress test with custom parameters
    $0 stress --vus 500 --duration 10m
    
    # All tests with Slack notifications
    $0 all --slack-webhook https://hooks.slack.com/...
    
    # Load test against staging environment
    $0 load --base-url https://staging.adaf.local --tag "staging-v1.2.0"

EOF
}

# Parse command line arguments
parse_args() {
    TEST_TYPE=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            load|stress|spike|endurance|all)
                TEST_TYPE="$1"
                shift
                ;;
            --base-url)
                BASE_URL="$2"
                shift 2
                ;;
            --duration)
                DURATION="$2"
                shift 2
                ;;
            --vus)
                VUS="$2"
                shift 2
                ;;
            --output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --tag)
                TEST_TAG="$2"
                shift 2
                ;;
            --no-report)
                GENERATE_REPORT=false
                shift
                ;;
            --slack-webhook)
                SLACK_WEBHOOK="$2"
                shift 2
                ;;
            --parallel)
                PARALLEL_TESTS=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Default to load test if no type specified
    if [[ -z "$TEST_TYPE" ]]; then
        TEST_TYPE="load"
    fi
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        error "k6 is not installed. Installing..."
        install_k6
    fi
    
    # Verify k6 version
    local k6_version=$(k6 version 2>/dev/null | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 | sed 's/v//')
    info "k6 version: $k6_version"
    
    # Check target application health
    info "Checking application health at $BASE_URL..."
    if ! curl -f -s "$BASE_URL/api/health" > /dev/null; then
        error "Application health check failed at $BASE_URL/api/health"
        exit 1
    fi
    success "Application is healthy"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    info "Output directory: $OUTPUT_DIR"
}

# Install k6 if not present
install_k6() {
    info "Installing k6..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            brew install k6
        else
            error "Homebrew not found. Please install k6 manually: https://k6.io/docs/get-started/installation/"
            exit 1
        fi
    else
        error "Unsupported OS. Please install k6 manually: https://k6.io/docs/get-started/installation/"
        exit 1
    fi
}

# Run individual test
run_test() {
    local test_type="$1"
    local output_file="$OUTPUT_DIR/${test_type}-test-results.json"
    local log_file="$OUTPUT_DIR/${test_type}-test.log"
    
    info "Starting $test_type test..."
    
    # Build k6 command
    local k6_cmd="k6 run"
    
    # Add output options
    k6_cmd="$k6_cmd --out json=$output_file"
    
    # Add environment variables
    k6_cmd="$k6_cmd --env BASE_URL=$BASE_URL"
    k6_cmd="$k6_cmd --env TEST_TAG=$TEST_TAG"
    
    # Add test-specific options
    case "$test_type" in
        "load")
            k6_cmd="$k6_cmd --stage 5m:50,10m:100,5m:0"
            ;;
        "stress")
            k6_cmd="$k6_cmd --stage 2m:100,5m:200,5m:400,5m:600,3m:0"
            ;;
        "spike")
            k6_cmd="$k6_cmd --stage 1m:50,30s:500,1m:50,30s:800,2m:50"
            ;;
        "endurance")
            k6_cmd="$k6_cmd --stage 5m:100,30m:100,5m:0"
            ;;
    esac
    
    # Override with custom duration/vus if provided
    if [[ -n "${DURATION:-}" ]]; then
        k6_cmd="$k6_cmd --duration $DURATION"
    fi
    
    if [[ -n "${VUS:-}" ]]; then
        k6_cmd="$k6_cmd --vus $VUS"
    fi
    
    # Add test script
    k6_cmd="$k6_cmd ./performance/k6/load-test.js"
    
    # Execute test
    local start_time=$(date +%s)
    
    if $k6_cmd > "$log_file" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        success "$test_type test completed in ${duration}s"
        
        # Parse results
        parse_test_results "$test_type" "$output_file" "$log_file"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        error "$test_type test failed after ${duration}s"
        
        # Show error details
        warn "Last 20 lines of log:"
        tail -20 "$log_file"
        return 1
    fi
}

# Parse test results and generate summary
parse_test_results() {
    local test_type="$1"
    local results_file="$2"
    local log_file="$3"
    
    info "Parsing $test_type test results..."
    
    # Extract key metrics from k6 JSON output
    if [[ -f "$results_file" ]]; then
        # Use jq to extract summary metrics (if available)
        if command -v jq &> /dev/null; then
            local summary_file="$OUTPUT_DIR/${test_type}-summary.json"
            
            # Extract final summary metrics
            tail -1 "$results_file" | jq '.' > "$summary_file" 2>/dev/null || true
            
            # Display key metrics
            if [[ -f "$summary_file" ]]; then
                info "$test_type Test Results:"
                echo "  Virtual Users: $(jq -r '.metrics.vus.value // "N/A"' "$summary_file")"
                echo "  HTTP Requests: $(jq -r '.metrics.http_reqs.count // "N/A"' "$summary_file")"
                echo "  Response Time p95: $(jq -r '.metrics.http_req_duration.values.p95 // "N/A"' "$summary_file")ms"
                echo "  Response Time p99: $(jq -r '.metrics.http_req_duration.values.p99 // "N/A"' "$summary_file")ms"
                echo "  Error Rate: $(jq -r '.metrics.http_req_failed.rate // "N/A"' "$summary_file")"
            fi
        fi
    fi
    
    # Generate HTML report if enabled
    if $GENERATE_REPORT; then
        generate_html_report "$test_type" "$results_file" "$log_file"
    fi
}

# Generate HTML report
generate_html_report() {
    local test_type="$1"
    local results_file="$2"
    local log_file="$3"
    local report_file="$OUTPUT_DIR/${test_type}-report.html"
    
    info "Generating HTML report for $test_type test..."
    
    # Simple HTML report template
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>ADAF Dashboard - $test_type Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .value { font-size: 24px; font-weight: bold; color: #007cba; }
        .log { background: #f8f8f8; padding: 15px; border-radius: 5px; overflow-x: auto; }
        pre { margin: 0; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ADAF Dashboard Performance Test Report</h1>
        <p><strong>Test Type:</strong> $test_type</p>
        <p><strong>Target URL:</strong> $BASE_URL</p>
        <p><strong>Test Tag:</strong> $TEST_TAG</p>
        <p><strong>Generated:</strong> $(date)</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <h3>Test Status</h3>
            <div class="value">COMPLETED</div>
        </div>
    </div>
    
    <h2>Test Log</h2>
    <div class="log">
        <pre>$(cat "$log_file" | tail -100)</pre>
    </div>
</body>
</html>
EOF
    
    success "HTML report generated: $report_file"
}

# Send Slack notification
send_slack_notification() {
    local test_type="$1"
    local status="$2"
    local message="$3"
    
    if [[ -z "$SLACK_WEBHOOK" ]]; then
        return 0
    fi
    
    info "Sending Slack notification..."
    
    local color="good"
    if [[ "$status" != "success" ]]; then
        color="danger"
    fi
    
    local payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "ADAF Dashboard Performance Test: $test_type",
            "fields": [
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Target URL",
                    "value": "$BASE_URL",
                    "short": true
                },
                {
                    "title": "Test Tag",
                    "value": "$TEST_TAG",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": false
                }
            ],
            "ts": $(date +%s)
        }
    ]
}
EOF
    )
    
    if curl -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK" &> /dev/null; then
        success "Slack notification sent"
    else
        warn "Failed to send Slack notification"
    fi
}

# Run all tests
run_all_tests() {
    local tests=("load" "stress" "spike" "endurance")
    local failed_tests=()
    
    info "Running all performance tests..."
    
    if $PARALLEL_TESTS; then
        info "Running tests in parallel..."
        local pids=()
        
        for test in "${tests[@]}"; do
            run_test "$test" &
            pids+=($!)
        done
        
        # Wait for all tests to complete
        for pid in "${pids[@]}"; do
            if ! wait "$pid"; then
                failed_tests+=("$test")
            fi
        done
    else
        info "Running tests sequentially..."
        
        for test in "${tests[@]}"; do
            if ! run_test "$test"; then
                failed_tests+=("$test")
            fi
        done
    fi
    
    # Report results
    if [[ ${#failed_tests[@]} -eq 0 ]]; then
        success "All performance tests completed successfully"
        send_slack_notification "all" "success" "All performance tests passed"
    else
        error "Failed tests: ${failed_tests[*]}"
        send_slack_notification "all" "failure" "Failed tests: ${failed_tests[*]}"
        return 1
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    info "ADAF Dashboard Performance Testing Suite"
    info "Test Type: $TEST_TYPE"
    info "Target URL: $BASE_URL"
    info "Test Tag: $TEST_TAG"
    
    check_prerequisites
    
    local start_time=$(date +%s)
    
    if [[ "$TEST_TYPE" == "all" ]]; then
        if run_all_tests; then
            local end_time=$(date +%s)
            local total_duration=$((end_time - start_time))
            success "Performance testing completed in ${total_duration}s"
            info "Results available in: $OUTPUT_DIR"
        else
            exit 1
        fi
    else
        if run_test "$TEST_TYPE"; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            success "Performance testing completed in ${duration}s"
            info "Results available in: $OUTPUT_DIR"
            send_slack_notification "$TEST_TYPE" "success" "Performance test completed successfully"
        else
            send_slack_notification "$TEST_TYPE" "failure" "Performance test failed"
            exit 1
        fi
    fi
}

# Handle script interruption
trap 'error "Performance testing interrupted"; exit 130' INT TERM

# Execute main function
main "$@"