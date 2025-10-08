#!/bin/bash
set -euo pipefail

echo "🤖 ADAF v0.9 Automation Container"
echo "=================================="

# Verificar variables de entorno requeridas
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "❌ Error: GITHUB_TOKEN no configurado"
    echo "💡 Usa: docker run -e GITHUB_TOKEN=your_token ..."
    exit 1
fi

# Configurar GitHub CLI
echo "$GITHUB_TOKEN" | gh auth login --with-token

# Obtener usuario actual
GITHUB_USER=$(gh api user --jq .login)
echo "👤 Usuario GitHub: $GITHUB_USER"

# Determinar nombre del repositorio
REPO_NAME="${REPO_NAME:-adaf-dashboard-$(date +%Y%m%d-%H%M%S)}"
echo "📦 Creando repositorio: $REPO_NAME"

# Ejecutar automatización completa
./scripts/auto-deploy-full.sh "$REPO_NAME" "$GITHUB_USER"

echo ""
echo "✅ Automatización completa exitosa"
echo "🌐 Repositorio: https://github.com/$GITHUB_USER/$REPO_NAME"