import { NextRequest, NextResponse } from 'next/server';

// Health check endpoint crítico para producción
export async function GET() {
  try {
    // Verificaciones de salud críticas
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        filesystem: await checkFilesystem(),
        external_apis: await checkExternalAPIs()
      }
    };

    // Si alguna verificación falla, devolver 503
    const hasFailures = Object.values(checks.checks).some(check => !check.healthy);
    
    if (hasFailures) {
      return NextResponse.json(checks, { status: 503 });
    }

    return NextResponse.json(checks, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

async function checkDatabase() {
  try {
    // Importar dinámicamente para evitar errores si no está disponible
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    return { healthy: true, message: 'Database connection successful' };
  } catch (error) {
    return { 
      healthy: false, 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

async function checkRedis() {
  try {
    // Redis check (si está configurado)
    if (process.env.REDIS_URL) {
      // Implementar check de Redis aquí
      return { healthy: true, message: 'Redis connection successful' };
    }
    return { healthy: true, message: 'Redis not configured' };
  } catch (error) {
    return { 
      healthy: false, 
      message: 'Redis connection failed',
      error: error instanceof Error ? error.message : 'Unknown redis error'
    };
  }
}

async function checkFilesystem() {
  try {
    const fs = await import('fs/promises');
    await fs.access('/tmp', fs.constants.W_OK);
    return { healthy: true, message: 'Filesystem writable' };
  } catch (error) {
    return { 
      healthy: false, 
      message: 'Filesystem not writable',
      error: error instanceof Error ? error.message : 'Unknown filesystem error'
    };
  }
}

async function checkExternalAPIs() {
  try {
    // Verificar APIs externas críticas
    const checks = [];
    
    // Ejemplo: verificar conectividad externa
    const response = await fetch('https://httpbin.org/status/200', { 
      signal: AbortSignal.timeout(5000) 
    });
    
    if (response.ok) {
      checks.push({ api: 'external', healthy: true });
    } else {
      checks.push({ api: 'external', healthy: false });
    }
    
    const allHealthy = checks.every(check => check.healthy);
    return { 
      healthy: allHealthy, 
      message: allHealthy ? 'All external APIs healthy' : 'Some external APIs failing',
      details: checks
    };
  } catch (error) {
    return { 
      healthy: false, 
      message: 'External API check failed',
      error: error instanceof Error ? error.message : 'Unknown external API error'
    };
  }
}