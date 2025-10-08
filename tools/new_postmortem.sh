#!/bin/bash

# ADAF Dashboard - Post-Mortem Generator Script
# 
# This script generates a new post-mortem document from the template
# with incident-specific information pre-filled.
#
# Usage: ./new_postmortem.sh --incident-id "HighAPIErrorRate" --severity "SEV2" [options]

set -euo pipefail

# Default values
INCIDENT_ID=""
SEVERITY=""
DESCRIPTION=""
START_TIME=""
COMPONENTS=""
TEMPLATE_PATH="docs/runbooks/templates/POSTMORTEM.md"
OUTPUT_DIR="docs/postmortems"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

# Show help
show_help() {
    cat << EOF
ADAF Dashboard Post-Mortem Generator

Usage: $0 [OPTIONS]

Options:
    --incident-id ID        Unique incident identifier (required)
    --severity LEVEL        Incident severity: SEV1, SEV2, SEV3, SEV4 (required)  
    --description TEXT      Brief incident description
    --start-time TIME       Incident start time (YYYY-MM-DD HH:MM UTC)
    --components LIST       Affected components (comma-separated)
    --template PATH         Path to post-mortem template (default: $TEMPLATE_PATH)
    --output-dir DIR        Output directory (default: $OUTPUT_DIR)
    -h, --help             Show this help message

Examples:
    # Basic post-mortem
    $0 --incident-id "HighAPIErrorRate" --severity "SEV2"
    
    # Detailed post-mortem  
    $0 --incident-id "DatabaseOutage" \\
       --severity "SEV1" \\
       --description "Primary database became unresponsive" \\
       --start-time "2025-09-30 14:30" \\
       --components "database,api,reports"
       
    # Custom template and output
    $0 --incident-id "WorkerLag" \\
       --severity "SEV3" \\
       --template "custom_template.md" \\
       --output-dir "incidents/2025"

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --incident-id)
                INCIDENT_ID="$2"
                shift 2
                ;;
            --severity)
                SEVERITY="$2"
                shift 2
                ;;
            --description)
                DESCRIPTION="$2"
                shift 2
                ;;
            --start-time)
                START_TIME="$2"
                shift 2
                ;;
            --components)
                COMPONENTS="$2"
                shift 2
                ;;
            --template)
                TEMPLATE_PATH="$2"
                shift 2
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log "${RED}ERROR: Unknown option: $1${NC}"
                echo
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate required arguments
validate_args() {
    local errors=()
    
    if [[ -z "$INCIDENT_ID" ]]; then
        errors+=("--incident-id is required")
    fi
    
    if [[ -z "$SEVERITY" ]]; then
        errors+=("--severity is required")
    elif [[ ! "$SEVERITY" =~ ^SEV[1-4]$ ]]; then
        errors+=("--severity must be SEV1, SEV2, SEV3, or SEV4")
    fi
    
    if [[ ! -f "$TEMPLATE_PATH" ]]; then
        errors+=("Template file not found: $TEMPLATE_PATH")
    fi
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        log "${RED}ERROR: Validation failed:${NC}"
        printf '%s\n' "${errors[@]}" >&2
        echo
        show_help
        exit 1
    fi
}

# Generate incident folio/ID
generate_folio() {
    local timestamp=$(date '+%Y%m%d-%H%M')
    local clean_id=$(echo "$INCIDENT_ID" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    echo "INCIDENT-${timestamp}-${clean_id}"
}

# Create output directory if it doesn't exist
ensure_output_dir() {
    if [[ ! -d "$OUTPUT_DIR" ]]; then
        log "${BLUE}Creating output directory: $OUTPUT_DIR${NC}"
        mkdir -p "$OUTPUT_DIR"
    fi
}

# Generate incident-specific values
generate_incident_values() {
    # Current timestamp
    CURRENT_DATE=$(date '+%Y-%m-%d')
    CURRENT_DATETIME=$(date '+%Y-%m-%d %H:%M')
    
    # Start time (use provided or current)
    if [[ -z "$START_TIME" ]]; then
        INCIDENT_START_TIME="$CURRENT_DATETIME"
    else
        INCIDENT_START_TIME="$START_TIME"
    fi
    
    # Generate folio
    FOLIO=$(generate_folio)
    
    # Output filename
    OUTPUT_FILE="${OUTPUT_DIR}/${FOLIO}.md"
    
    # Default description if not provided
    if [[ -z "$DESCRIPTION" ]]; then
        DESCRIPTION="Incident: $INCIDENT_ID"
    fi
    
    # Process components
    if [[ -n "$COMPONENTS" ]]; then
        COMPONENT_LIST=$(echo "$COMPONENTS" | tr ',' '\n' | sed 's/^/- /' | tr '\n' '|' | sed 's/|$//')
    else
        COMPONENT_LIST="- [Component to be determined]"
    fi
}

# Replace template placeholders
process_template() {
    log "${BLUE}Processing template: $TEMPLATE_PATH${NC}"
    
    # Read template and replace placeholders
    sed -e "s/INCIDENT-YYYYMMDD-HHMM/$FOLIO/g" \
        -e "s/YYYY-MM-DD/$CURRENT_DATE/g" \
        -e "s/SEV1\/SEV2\/SEV3\/SEV4/$SEVERITY/g" \
        -e "s/RESOLVED\/UNDER INVESTIGATION/UNDER INVESTIGATION/g" \
        -e "s/\[One-sentence description of the incident\]/$DESCRIPTION/g" \
        -e "s/\[Start time\]/$INCIDENT_START_TIME/g" \
        -e "s/\[End time\]/TBD/g" \
        -e "s/\[Duration\]/TBD/g" \
        -e "s/@username/@$(whoami)/g" \
        "$TEMPLATE_PATH" > "$OUTPUT_FILE"
    
    # Replace component placeholders if provided
    if [[ -n "$COMPONENTS" ]]; then
        # This is a simplified replacement - in practice you might want more sophisticated processing
        sed -i "s/\[Which microservices\/components\]/$COMPONENT_LIST/g" "$OUTPUT_FILE"
    fi
}

# Add incident-specific sections
add_incident_context() {
    # Add a comment at the top with generation info
    cat > "${OUTPUT_FILE}.tmp" << EOF
<!-- 
Post-Mortem generated on: $CURRENT_DATETIME UTC
Generator: tools/new_postmortem.sh
Incident: $INCIDENT_ID
Severity: $SEVERITY
Author: $(whoami)
-->

EOF
    
    cat "$OUTPUT_FILE" >> "${OUTPUT_FILE}.tmp"
    mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
    
    # Add initial timeline entry
    if [[ -n "$START_TIME" ]]; then
        sed -i "/| Time | Event | Actor | Action\/Observation |/a\\
| $(date -d "$START_TIME" '+%H:%M' 2>/dev/null || echo 'HH:MM') | Initial trigger | System | Alert fired: $INCIDENT_ID |" "$OUTPUT_FILE"
    fi
}

# Create change log entry
create_change_log_entry() {
    local change_log_file="docs/change_logs/postmortem_generated.log"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$change_log_file")"
    
    # Log the post-mortem creation
    echo "$(date '+%Y-%m-%d %H:%M:%S UTC') | POST_MORTEM_CREATED | $FOLIO | Severity: $SEVERITY | Author: $(whoami) | File: $OUTPUT_FILE" >> "$change_log_file"
}

# Main execution
main() {
    log "${GREEN}Starting ADAF Post-Mortem Generator${NC}"
    
    # Parse and validate arguments
    parse_args "$@"
    validate_args
    
    # Generate incident-specific values
    generate_incident_values
    
    # Prepare output
    ensure_output_dir
    
    # Check if output file already exists
    if [[ -f "$OUTPUT_FILE" ]]; then
        log "${YELLOW}WARNING: Output file already exists: $OUTPUT_FILE${NC}"
        read -p "Overwrite existing file? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "${BLUE}Operation cancelled by user${NC}"
            exit 0
        fi
    fi
    
    # Process template
    process_template
    
    # Add incident-specific context
    add_incident_context
    
    # Create change log entry
    create_change_log_entry
    
    # Success message
    log "${GREEN}Post-mortem generated successfully!${NC}"
    echo
    echo "📄 File: $OUTPUT_FILE"
    echo "🆔 Incident ID: $FOLIO" 
    echo "⚠️  Severity: $SEVERITY"
    echo "📅 Created: $CURRENT_DATETIME UTC"
    echo
    echo "Next steps:"
    echo "1. Edit the generated file to add incident details"
    echo "2. Fill in the timeline with actual events"  
    echo "3. Complete root cause analysis when investigation is done"
    echo "4. Add corrective actions with owners and due dates"
    echo "5. Get approvals and distribute to stakeholders"
    echo
    echo "To open the file:"
    echo "  code '$OUTPUT_FILE'"
    echo "  vim '$OUTPUT_FILE'"
    echo
}

# Handle script interruption
trap 'log "${RED}Script interrupted${NC}"; exit 130' INT TERM

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi