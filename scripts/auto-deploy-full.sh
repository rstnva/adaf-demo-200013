#!/usr/bin/env bash
set -euo pipefail

# 🤖 AUTOMATIZACIÓN COMPLETA ADAF v0.9
# Este script automatiza todo el proceso desde cero

REPO_NAME="${1:-adaf-dashboard-auto-$(date +%Y%m%d-%H%M%S)}"
GITHUB_USER="${2:-$(gh api user --jq .login)}"
SOURCE_DIR="$(pwd)"

echo "🚀 INICIANDO AUTOMATIZACIÓN COMPLETA ADAF v0.9"
echo "📦 Nuevo repositorio: $GITHUB_USER/$REPO_NAME"
echo "📁 Código fuente: $SOURCE_DIR"
echo ""

# 1. Crear repositorio en GitHub
echo "1️⃣ Creando repositorio en GitHub..."
gh repo create "$REPO_NAME" --public --description "ADAF Dashboard Pro - Automated Deployment" --add-readme

# 2. Clonar localmente y copiar código
echo "2️⃣ Clonando y copiando código..."
cd /tmp
git clone "https://github.com/$GITHUB_USER/$REPO_NAME.git"
cd "$REPO_NAME"

# Configurar Git para commits automáticos
git config user.email "automation@adaf.com"
git config user.name "ADAF Automation"

# Copiar todo excepto .git
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' "$SOURCE_DIR/" ./

# 3. Commit inicial
echo "3️⃣ Commit inicial del código..."
git add .
git commit -m "feat: Initial ADAF Dashboard Pro deployment

- Complete production infrastructure
- CI/CD workflows ready  
- Project management automation
- Security hardening implemented"

git push origin main

# 4. Ejecutar bootstrap del proyecto
echo "4️⃣ Configurando proyecto management..."
chmod +x scripts/bootstrap-project.sh scripts/create-issues.sh

# Crear labels y milestones
./scripts/bootstrap-project.sh

# 5. Workflow validation
echo "5️⃣ Validando workflows..."
sleep 10
gh run list --limit 3

echo ""
echo "✅ AUTOMATIZACIÓN COMPLETA"
echo "🌐 Repositorio: https://github.com/$GITHUB_USER/$REPO_NAME"
echo "📊 Issues y Milestones: Configurados automáticamente"
echo "🔄 CI/CD: Workflows ejecutándose"
echo ""
echo "📋 Próximos pasos:"
echo "   - Revisar workflows en GitHub Actions"
echo "   - Configurar secrets si es necesario"  
echo "   - Seguir milestones M1-M5"