#!/bin/bash

# Simple markdown fixer for common issues
fix_file() {
    local file="$1"
    echo "Fixing $file..."
    
    # Add missing newline at end
    if [[ -f "$file" && $(tail -c1 "$file" | wc -l) -eq 0 ]]; then
        echo "" >> "$file"
    fi
    
    # Fix bare URLs (basic)
    sed -i 's|: http://|: <http://|g; s|: https://|: <https://|g' "$file" 2>/dev/null || true
    sed -i 's|>\([^<]*\)$|>\1>|g' "$file" 2>/dev/null || true
}

# Fix runbook files
for file in docs/runbooks/*.md docs/runbooks/templates/*.md; do
    if [[ -f "$file" ]]; then
        fix_file "$file"
    fi
done

echo "Basic markdown fixes applied!"
