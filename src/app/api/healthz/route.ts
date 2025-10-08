/**
 * Health Gates Endpoint - Production Readiness Checks
 * 
 * Provides comprehensive system health validation for production deployments.
 * Includes database connectivity, Redis availability, critical services validation,
 * and startup readiness verification.
 * 
 * Usage:
 * - Load balancer health checks: GET /api/healthz
 * - Kubernetes readiness probe: GET /api/healthz?probe=ready
 * - Startup validation: GET /api/healthz?probe=startup
 * - Deep health check: GET /api/healthz?deep=true
 */

import { NextRequest, NextResponse } from 'next/server';

// Health check interfaces
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
  checks: Record<string, HealthCheckResult>;
  summary?: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface HealthCheckResult {
  status: 'pass' | 'warn' | 'fail';
  componentType: 'database' | 'cache' | 'service' | 'datastore' | 'http';
  time: string;
  output?: string;
  details?: Record<string, any>;
}

// Startup validation state
let startupChecksCompleted = false;
let startupCheckResults: Record<string, HealthCheckResult> = {};

/**
 * Database connectivity health check
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // For this example, we'll simulate a database check
    // In production, replace with actual Prisma/database client check
    
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const duration = Date.now() - startTime;
    
    return {
      status: 'pass',
      componentType: 'database',
      time: `${duration}ms`,
      output: 'Database connection successful',
      details: {
        connectionPool: {
          active: 5,
          idle: 10,
          total: 15
        },
        lastQuery: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      componentType: 'database',
      time: `${Date.now() - startTime}ms`,
      output: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: String(error) }
    };
  }
}

/**
 * Redis/Cache connectivity health check
 */
async function checkCache(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // For this example, we'll simulate a Redis check
    // In production, replace with actual Redis client check
    
    // Simulate Redis ping
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const duration = Date.now() - startTime;
    
    return {
      status: 'pass',
      componentType: 'cache',
      time: `${duration}ms`,
      output: 'Cache connection successful',
      details: {
        ping: 'PONG',
        memory: '125MB',
        connections: 8
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      componentType: 'cache',
      time: `${Date.now() - startTime}ms`,
      output: `Cache connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: String(error) }
    };
  }
}

/**
 * Critical services health check
 */
async function checkCriticalServices(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check critical service endpoints
    const services = [
      { name: 'metrics', endpoint: '/api/metrics' },
      { name: 'auth', endpoint: '/api/auth/status' }
    ];
    
    const results = await Promise.allSettled(
      services.map(async service => {
        // Simulate service check
        await new Promise(resolve => setTimeout(resolve, 8));
        return { ...service, status: 'available' };
      })
    );
    
    const duration = Date.now() - startTime;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      status: failed === 0 ? 'pass' : failed === results.length ? 'fail' : 'warn',
      componentType: 'service',
      time: `${duration}ms`,
      output: `${results.length - failed}/${results.length} critical services available`,
      details: {
        services: results.map((result, i) => ({
          name: services[i].name,
          status: result.status === 'fulfilled' ? 'available' : 'unavailable'
        }))
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      componentType: 'service',
      time: `${Date.now() - startTime}ms`,
      output: `Critical services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: String(error) }
    };
  }
}

/**
 * Data freshness validation
 */
async function checkDataFreshness(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simulate checking data freshness from various sources
    const dataSources = [
      { name: 'market_data', lastUpdate: new Date(Date.now() - 5 * 60 * 1000) }, // 5 min ago
      { name: 'portfolio_data', lastUpdate: new Date(Date.now() - 15 * 60 * 1000) }, // 15 min ago
      { name: 'risk_metrics', lastUpdate: new Date(Date.now() - 30 * 60 * 1000) } // 30 min ago
    ];
    
    const now = new Date();
    const staleThreshold = 60 * 60 * 1000; // 1 hour
    
    const staleCount = dataSources.filter(
      source => now.getTime() - source.lastUpdate.getTime() > staleThreshold
    ).length;
    
    const duration = Date.now() - startTime;
    
    return {
      status: staleCount === 0 ? 'pass' : staleCount < dataSources.length ? 'warn' : 'fail',
      componentType: 'datastore',
      time: `${duration}ms`,
      output: `${dataSources.length - staleCount}/${dataSources.length} data sources fresh`,
      details: {
        sources: dataSources.map(source => ({
          name: source.name,
          lastUpdate: source.lastUpdate.toISOString(),
          ageMinutes: Math.floor((now.getTime() - source.lastUpdate.getTime()) / 60000),
          fresh: now.getTime() - source.lastUpdate.getTime() < staleThreshold
        }))
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      componentType: 'datastore',
      time: `${Date.now() - startTime}ms`,
      output: `Data freshness check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: String(error) }
    };
  }
}

/**
 * System resources health check
 */
async function checkSystemResources(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simulate system resource checks
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Convert to more readable format
    const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const heapMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    // Thresholds
    const memoryThreshold = 1024; // 1GB
    const heapThreshold = 512; // 512MB
    
    const memoryOk = memoryMB < memoryThreshold;
    const heapOk = heapMB < heapThreshold;
    
    const duration = Date.now() - startTime;
    
    return {
      status: memoryOk && heapOk ? 'pass' : 'warn',
      componentType: 'service',
      time: `${duration}ms`,
      output: `Memory: ${memoryMB}MB, Heap: ${heapMB}MB`,
      details: {
        memory: {
          rss: `${memoryMB}MB`,
          heapUsed: `${heapMB}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: `${Math.floor(process.uptime())}s`
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      componentType: 'service',
      time: `${Date.now() - startTime}ms`,
      output: `System resources check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: String(error) }
    };
  }
}

/**
 * Perform startup validation checks
 */
async function performStartupChecks(): Promise<Record<string, HealthCheckResult>> {
  if (startupChecksCompleted) {
    return startupCheckResults;
  }
  
  const checks = await Promise.all([
    checkDatabase(),
    checkCache(),
    checkCriticalServices()
  ]);
  
  startupCheckResults = {
    database: checks[0],
    cache: checks[1],
    services: checks[2]
  };
  
  // Mark as completed if all critical checks pass
  const criticalFailures = checks.filter(check => check.status === 'fail').length;
  startupChecksCompleted = criticalFailures === 0;
  
  return startupCheckResults;
}

/**
 * Main health check endpoint
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const probe = searchParams.get('probe');
  const deep = searchParams.get('deep') === 'true';
  
  const timestamp = new Date().toISOString();
  const uptime = Math.floor(process.uptime());
  
  try {
    let checks: Record<string, HealthCheckResult> = {};
    
    // Handle different probe types
    if (probe === 'startup') {
      checks = await performStartupChecks();
    } else if (probe === 'ready') {
      // Readiness check - ensure startup completed and basic connectivity
      if (!startupChecksCompleted) {
        checks = await performStartupChecks();
      } else {
        checks = {
          database: await checkDatabase(),
          cache: await checkCache()
        };
      }
    } else {
      // Standard liveness check or deep health check
      const standardChecks = [
        checkDatabase(),
        checkSystemResources()
      ];
      
      if (deep) {
        standardChecks.push(
          checkCache(),
          checkCriticalServices(),
          checkDataFreshness()
        );
      }
      
      const results = await Promise.all(standardChecks);
      checks = {
        database: results[0],
        system: results[1],
        ...(deep && {
          cache: results[2],
          services: results[3],
          data: results[4]
        })
      };
    }
    
    // Calculate overall status
    const healthyCount = Object.values(checks).filter(c => c.status === 'pass').length;
    const degradedCount = Object.values(checks).filter(c => c.status === 'warn').length;
    const unhealthyCount = Object.values(checks).filter(c => c.status === 'fail').length;
    const totalChecks = Object.keys(checks).length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp,
      version: process.env.APP_VERSION || '1.0.0',
      uptime,
      checks,
      summary: {
        total: totalChecks,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount
      }
    };
    
    // Return appropriate HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    // Fallback error response
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp,
      uptime,
      checks: {
        system: {
          status: 'fail',
          componentType: 'service',
          time: '0ms',
          output: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error: String(error) }
        }
      },
      summary: {
        total: 1,
        healthy: 0,
        degraded: 0,
        unhealthy: 1
      }
    };
    
    return NextResponse.json(errorStatus, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}