#!/usr/bin/env bash
set -euo pipefail

# Requisitos: gh CLI autenticado, jq

REPO_SLUG=${1:-"$(gh repo view --json nameWithOwner -q .nameWithOwner)"}
PROJECT_NAME=${PROJECT_NAME:-"ADAF v0.9 (8w)"}

echo "Repo: $REPO_SLUG"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq no encontrado. Instálalo para continuar." >&2
  exit 1
fi

DATA_DIR_ROOT="project-data"
DATA_DIR_FALLBACK="scripts/project-data"
LABELS_FILE="${DATA_DIR_ROOT}/labels.json"
[[ -f "$LABELS_FILE" ]] || LABELS_FILE="${DATA_DIR_FALLBACK}/labels.json"

echo "Creando labels (fuente: $LABELS_FILE)..."
jq -c '.[]' "$LABELS_FILE" | while read -r lbl; do
  name=$(echo "$lbl" | jq -r .name)
  color=$(echo "$lbl" | jq -r .color)
  desc=$(echo "$lbl" | jq -r .description)
  gh label create "$name" --color "$color" --description "$desc" --repo "$REPO_SLUG" 2>/dev/null || gh label edit "$name" --color "$color" --description "$desc" --repo "$REPO_SLUG"
done

MILESTONES_FILE="${DATA_DIR_ROOT}/milestones.json"
[[ -f "$MILESTONES_FILE" ]] || MILESTONES_FILE="${DATA_DIR_FALLBACK}/milestones.json"

echo "Creando milestones (fuente: $MILESTONES_FILE)..."
jq -c '.[]' "$MILESTONES_FILE" | while read -r ms; do
  title=$(echo "$ms" | jq -r .title)
  desc=$(echo "$ms" | jq -r .description)
  gh api repos/$REPO_SLUG/milestones -f title="$title" -f description="$desc" >/dev/null 2>&1 || echo "Milestone existente: $title"
done

echo "Creando Project (repo scoped) si no existe..."
proj_id=$(gh api graphql -F ownerRepo="$REPO_SLUG" -f query='query($ownerRepo:String!){ repository(nameWithOwner:$ownerRepo){projectsV2(first:100){nodes{id,title}}}}' | jq -r --arg n "$PROJECT_NAME" '.data.repository.projectsV2.nodes[] | select(.title==$n) | .id' || true)
if [[ -z "$proj_id" ]]; then
  proj_id=$(gh api graphql -f query='mutation($repo:ID!,$title:String!){ createProjectV2(input:{ownerId:$repo,title:$title}){projectV2{id}} }' -f repo=$(gh api graphql -F ownerRepo="$REPO_SLUG" -f query='query($ownerRepo:String!){ repository(nameWithOwner:$ownerRepo){id} }' | jq -r .data.repository.id) -F title="$PROJECT_NAME" | jq -r .data.createProjectV2.projectV2.id)
  echo "Proyecto creado: $PROJECT_NAME ($proj_id)"
else
  echo "Proyecto ya existe: $PROJECT_NAME ($proj_id)"
fi

echo "Añadiendo vistas sugeridas (nota: GitHub Projects v2 requiere configuración manual mediante UI/API avanzada)."
echo "Bootstrap completado. Usa scripts/create-issues.sh para poblar issues."
