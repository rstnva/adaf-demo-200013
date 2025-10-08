# ADAF v0.9 Automation Makefile

.PHONY: help install deploy deploy-new deploy-docker clean validate

# Variables
REPO_NAME ?= adaf-dashboard-$(shell date +%Y%m%d-%H%M%S)
GITHUB_USER ?= $(shell gh api user --jq .login 2>/dev/null || echo "unknown")

help: ## Mostrar ayuda
	@echo "🤖 ADAF v0.9 Automation Commands"
	@echo "================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependencias locales
	@echo "📦 Instalando dependencias..."
	@command -v gh >/dev/null 2>&1 || (echo "❌ GitHub CLI no encontrado. Instala desde https://cli.github.com/" && exit 1)
	@command -v jq >/dev/null 2>&1 || (echo "❌ jq no encontrado. Instala con: sudo apt install jq" && exit 1)
	@chmod +x scripts/*.sh
	@echo "✅ Dependencias listas"

deploy: install ## Desplegar en repositorio actual
	@echo "🚀 Desplegando en repositorio actual..."
	@./scripts/bootstrap-project.sh
	@echo "✅ Deployment completo"

deploy-new: install ## Crear nuevo repositorio y desplegar
	@echo "🚀 Creando nuevo repositorio: $(REPO_NAME)"
	@./scripts/auto-deploy-full.sh "$(REPO_NAME)" "$(GITHUB_USER)"

deploy-docker: ## Desplegar usando Docker (requiere GITHUB_TOKEN)
	@echo "🐳 Desplegando con Docker..."
	@docker build -f Dockerfile.automation -t adaf-automation .
	@docker run --rm \
		-e GITHUB_TOKEN="$(GITHUB_TOKEN)" \
		-e REPO_NAME="$(REPO_NAME)" \
		adaf-automation

validate: ## Validar configuración actual
	@echo "🔍 Validando configuración..."
	@gh auth status
	@echo "👤 Usuario: $(GITHUB_USER)"
	@echo "📁 Archivos de configuración:"
	@ls -la project-data/
	@echo "🔧 Scripts disponibles:"
	@ls -la scripts/*.sh
	@echo "✅ Validación completa"

clean: ## Limpiar archivos temporales
	@echo "🧹 Limpiando archivos temporales..."
	@rm -rf node_modules .next coverage
	@echo "✅ Limpieza completa"

# Comandos de desarrollo rápido
quick-demo: ## Crear demo rápido (repo temporal)
	@$(MAKE) deploy-new REPO_NAME=adaf-demo-$(shell date +%H%M%S)

production-deploy: ## Deploy para producción (requiere confirmación)
	@echo "⚠️  Deployment de PRODUCCIÓN - ¿Continuar? [y/N]" && read ans && [ $${ans:-N} = y ]
	@$(MAKE) deploy-new REPO_NAME=adaf-dashboard-prod

# Automatización completa con un comando
auto: install deploy-new ## Automatización completa (instalar + crear repo + desplegar)
	@echo "🎉 Automatización completa exitosa"