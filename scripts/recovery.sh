#!/bin/bash

# Script de recuperación automática para producción
# Este script se ejecuta cuando se detecta un fallo crítico

set -euo pipefail

# Configuración
LOG_FILE="/var/log/adaf-recovery.log"
HEALTH_URL="http://localhost:3005/api/health"
MAX_RETRIES=3
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para enviar alertas
send_alert() {
    local message="$1"
    local severity="${2:-WARNING}"
    
    log "$severity: $message"
    
    # Enviar a Slack si está configurado
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 ADAF Dashboard [$severity]: $message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
    
    # Enviar email si está configurado
    if command -v mail &> /dev/null && [[ -n "${ALERT_EMAIL:-}" ]]; then
        echo "$message" | mail -s "ADAF Dashboard Alert [$severity]" "$ALERT_EMAIL" || true
    fi
}

# Verificar salud del sistema
check_health() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
    
    if [[ "$response" == "200" ]]; then
        return 0
    else
        return 1
    fi
}

# Reiniciar base de datos
restart_database() {
    log "Intentando reiniciar base de datos PostgreSQL..."
    
    if command -v systemctl &> /dev/null; then
        sudo systemctl restart postgresql || true
    fi
    
    # Si estamos usando Docker
    if command -v docker &> /dev/null; then
        docker restart adaf-postgres 2>/dev/null || true
    fi
    
    sleep 10
}

# Reiniciar aplicación
restart_application() {
    log "Reiniciando aplicación ADAF..."
    
    # Si usamos Docker Compose
    if [[ -f "/app/docker-compose.prod.yml" ]]; then
        cd /app
        docker-compose -f docker-compose.prod.yml restart app
        sleep 15
        return
    fi
    
    # Si usamos PM2
    if command -v pm2 &> /dev/null; then
        pm2 restart adaf-dashboard
        sleep 10
        return
    fi
    
    # Si usamos systemd
    if command -v systemctl &> /dev/null; then
        sudo systemctl restart adaf-dashboard
        sleep 10
        return
    fi
    
    log "No se encontró método de reinicio para la aplicación"
}

# Limpiar recursos
cleanup_resources() {
    log "Liberando recursos del sistema..."
    
    # Limpiar logs antiguos
    find /var/log -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Limpiar cache de Next.js
    rm -rf /app/.next/cache/* 2>/dev/null || true
    
    # Limpiar archivos temporales
    find /tmp -type f -mtime +1 -delete 2>/dev/null || true
    
    # Liberar memoria si está disponible
    if [[ -f /proc/sys/vm/drop_caches ]]; then
        echo 1 > /proc/sys/vm/drop_caches 2>/dev/null || true
    fi
}

# Función principal de recuperación
main_recovery() {
    local retry_count=0
    
    log "Iniciando proceso de recuperación automática..."
    send_alert "Sistema detectó fallo, iniciando recuperación automática" "CRITICAL"
    
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        log "Intento de recuperación $((retry_count + 1))/$MAX_RETRIES"
        
        # Paso 1: Limpiar recursos
        cleanup_resources
        
        # Paso 2: Reiniciar base de datos
        restart_database
        
        # Paso 3: Reiniciar aplicación
        restart_application
        
        # Paso 4: Verificar si se recuperó
        log "Verificando salud del sistema..."
        sleep 20
        
        if check_health; then
            log "✅ Sistema recuperado exitosamente en intento $((retry_count + 1))"
            send_alert "Sistema recuperado exitosamente en intento $((retry_count + 1))" "SUCCESS"
            exit 0
        fi
        
        retry_count=$((retry_count + 1))
        if [[ $retry_count -lt $MAX_RETRIES ]]; then
            log "Intento fallido, esperando antes del siguiente..."
            sleep 30
        fi
    done
    
    # Si llegamos aquí, todos los intentos fallaron
    log "❌ FALLO CRÍTICO: No se pudo recuperar el sistema después de $MAX_RETRIES intentos"
    send_alert "FALLO CRÍTICO: Sistema no se pudo recuperar después de $MAX_RETRIES intentos. Intervención manual requerida." "CRITICAL"
    exit 1
}

# Verificar si necesitamos recuperación
if ! check_health; then
    main_recovery
else
    log "Sistema funcionando correctamente"
fi