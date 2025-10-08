-- Inicialización de base de datos para producción
-- Este script se ejecuta automáticamente al crear el contenedor

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configurar timezone
SET timezone = 'UTC';

-- Crear índices críticos para performance
-- (Estos se ejecutarán después de que Prisma cree las tablas)

-- Script para optimizaciones post-deployment
CREATE OR REPLACE FUNCTION optimize_database() RETURNS void AS $$
BEGIN
    -- Actualizar estadísticas
    ANALYZE;
    
    -- Log de optimización
    RAISE NOTICE 'Base de datos optimizada en %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Función para monitoreo de salud de DB
CREATE OR REPLACE FUNCTION health_check() RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'status', 'healthy',
        'timestamp', NOW(),
        'connections', (SELECT count(*) FROM pg_stat_activity),
        'database_size', pg_size_pretty(pg_database_size(current_database())),
        'version', version()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;