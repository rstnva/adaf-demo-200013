#!/bin/bash

# Configuración del monitoreo continuo
HEALTH_URL="http://localhost:3005/api/health"
CHECK_INTERVAL=30
LOG_FILE="/var/log/adaf-monitor.log"
RECOVERY_SCRIPT="/app/scripts/recovery.sh"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para verificar métricas críticas
check_metrics() {
    local cpu_usage memory_usage disk_usage
    
    # CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    
    # Memory usage
    memory_usage=$(free | grep Mem | awk '{printf("%.1f", ($3/$2) * 100.0)}')
    
    # Disk usage
    disk_usage=$(df /app | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    
    log "Métricas - CPU: ${cpu_usage}%, Memoria: ${memory_usage}%, Disco: ${disk_usage}%"
    
    # Alertar si los recursos están críticos
    if (( $(echo "$cpu_usage > 90" | bc -l) )); then
        log "ALERTA: Uso de CPU crítico: ${cpu_usage}%"
    fi
    
    if (( $(echo "$memory_usage > 85" | bc -l) )); then
        log "ALERTA: Uso de memoria crítico: ${memory_usage}%"
    fi
    
    if (( disk_usage > 90 )); then
        log "ALERTA: Uso de disco crítico: ${disk_usage}%"
    fi
}

# Monitoreo principal
while true; do
    if ! curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
        log "❌ Health check falló - Iniciando recuperación automática"
        bash "$RECOVERY_SCRIPT"
    else
        log "✅ Sistema saludable"
        check_metrics
    fi
    
    sleep "$CHECK_INTERVAL"
done