#!/usr/bin/env bash
set -euo pipefail

# Requisitos: gh CLI, jq
REPO_SLUG=${1:-"$(gh repo view --json nameWithOwner -q .nameWithOwner)"}
DATA_FILE=${2:-""}
if [[ -z "${DATA_FILE}" ]]; then
  if [[ -f "project-data/issues.json" ]]; then
    DATA_FILE="project-data/issues.json"
  else
    DATA_FILE="scripts/project-data/issues.json"
  fi
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq no encontrado" >&2
  exit 1
fi

echo "Creando issues en $REPO_SLUG desde $DATA_FILE ..."

jq -c '.[]' "$DATA_FILE" | while read -r it; do
  title=$(echo "$it" | jq -r .title)
  body=$(echo "$it" | jq -r .body)
  labels=$(echo "$it" | jq -r '.labels | join(",")')
  milestone=$(echo "$it" | jq -r .milestone)

  # Check if milestone exists
  ms_exists=$(gh api repos/$REPO_SLUG/milestones | jq -r --arg t "$milestone" '.[] | select(.title==$t) | .title')
  if [[ -z "$ms_exists" ]]; then
    echo "Milestone no encontrado: $milestone" >&2
    continue
  fi

  gh issue create --repo "$REPO_SLUG" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$milestone"
done

echo "Issues creados. Vincula al Project en la UI o usa 'gh project' para automatizar campos."
