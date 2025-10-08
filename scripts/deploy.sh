#!/bin/bash

# Script de deployment automatizado para producción
set -euo pipefail

# Configuración
PROJECT_DIR="/home/parallels/Desktop/adaf-dashboard-pro"
BACKUP_DIR="/var/backups/adaf"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deployment de ADAF Dashboard..."

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

# Backup de base de datos antes del deployment
if [[ -n "${DATABASE_URL:-}" ]]; then
    echo "📦 Creando backup de base de datos..."
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_backup_$DATE.sql" || echo "⚠️  Backup de DB falló"
fi

# Detener servicios actuales
echo "🔄 Deteniendo servicios actuales..."
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" down || echo "No hay servicios ejecutándose"

# Build de nuevas imágenes
echo "🏗️  Construyendo nueva imagen..."
cd "$PROJECT_DIR"
docker build -f Dockerfile.prod -t adaf-dashboard:latest .

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose -f docker-compose.prod.yml up -d

# Esperar que los servicios estén listos
echo "⏳ Esperando que los servicios estén disponibles..."
sleep 30

# Verificar salud del sistema
echo "🔍 Verificando salud del sistema..."
for i in {1..10}; do
    if curl -f http://localhost:3005/api/health > /dev/null 2>&1; then
        echo "✅ Sistema desplegado exitosamente!"
        
        # Iniciar monitoreo
        echo "📊 Iniciando monitoreo automático..."
        nohup ./scripts/monitor.sh > /var/log/adaf-monitor.log 2>&1 &
        
        echo "🎉 Deployment completado!"
        echo "📊 Dashboard disponible en: http://localhost:3005"
        echo "📈 Health check: http://localhost:3005/api/health"
        echo "📋 Logs: docker-compose -f docker-compose.prod.yml logs -f"
        
        exit 0
    fi
    
    echo "⏳ Intento $i/10 - Esperando..."
    sleep 10
done

echo "❌ FALLO EN DEPLOYMENT: Sistema no responde después de 100 segundos"
echo "🔧 Ejecutando recuperación automática..."
./scripts/recovery.sh

exit 1