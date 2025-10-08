#!/bin/bash

# Demo de monitoreo en tiempo real
echo "🔥 INICIANDO SIMULACIÓN DE MONITOREO ADAF DASHBOARD"
echo "💰 Simulando sistema con millones de USD en riesgo"
echo "=================================================="

for i in {1..10}; do
    echo -e "\n⏱️  CHECK #$i - $(date '+%H:%M:%S')"
    
    response=$(curl -s -w "%{http_code}" http://localhost:3005/api/health)
    status_code="${response: -3}"
    
    if [[ "$status_code" == "200" ]]; then
        echo "✅ SISTEMA SALUDABLE - Todo funcionando correctamente"
        echo "💚 Status: $status_code - Trading seguro"
    elif [[ "$status_code" == "503" ]]; then
        echo "🚨 FALLO DETECTADO - Activando protocolos de emergencia"  
        echo "🔴 Status: $status_code - Trading suspendido por seguridad"
        echo "🛠️  En producción → Ejecutaría recovery.sh automáticamente"
    else
        echo "⚠️  Status desconocido: $status_code"
    fi
    
    sleep 3
done

echo -e "\n🏁 DEMO COMPLETADA"
echo "En producción esto correría 24/7 con alertas automáticas"