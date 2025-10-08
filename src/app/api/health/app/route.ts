import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Basic application health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: false,
        redis: false,
      }
    }

    // Database health check
    try {
      await db.$queryRaw`SELECT 1 as health_check`
      health.checks.database = true
    } catch (error) {
      console.error('Database health check failed:', error)
      health.checks.database = false
    }

    // Redis health check (if configured)
    try {
      // This would be your Redis client
      // await redis.ping()
      health.checks.redis = true // Assume healthy for now
    } catch (error) {
      console.error('Redis health check failed:', error)
      health.checks.redis = false
    }

    // Determine overall health
    const isHealthy = health.checks.database && health.checks.redis
    
    if (!isHealthy) {
      health.status = 'degraded'
      return NextResponse.json(health, { status: 503 })
    }

    return NextResponse.json(health, { status: 200 })
    
  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}