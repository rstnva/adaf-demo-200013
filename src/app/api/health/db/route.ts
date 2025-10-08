import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Basic connection test
    await db.$queryRaw`SELECT 1 as connection_test`
    
    // Check if we can query a real table
    const tableCheck = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 1
    `
    
    // Get database stats
    const dbStats = await db.$queryRaw`
      SELECT 
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
    ` as any[]
    
    const responseTime = Date.now() - startTime
    
    // Get replication lag if we're using a standby
    let replicationLag = null
    try {
      const lagCheck = await db.$queryRaw`
        SELECT 
          CASE 
            WHEN pg_is_in_recovery() THEN 
              EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int
            ELSE 0
          END as lag_seconds
      ` as any[]
      
      replicationLag = lagCheck[0]?.lag_seconds || 0
    } catch (error) {
      // Primary database, no replication lag
      replicationLag = 0
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      database: {
        connected: true,
        status: 'healthy',
        response_time_ms: responseTime,
        size_bytes: dbStats[0]?.db_size || 0,
        active_connections: parseInt(dbStats[0]?.active_connections || '0'),
        max_connections: parseInt(dbStats[0]?.max_connections || '0'),
        replication_lag_seconds: replicationLag
      }
    }

    // Check if response time is acceptable
    if (responseTime > 1000) {
      health.status = 'degraded'
      return NextResponse.json(health, { status: 503 })
    }

    // Check if replication lag is too high
    if (replicationLag > 30) {
      health.status = 'degraded'
      health.database.status = 'high_replication_lag'
      return NextResponse.json(health, { status: 503 })
    }

    return NextResponse.json(health, { status: 200 })
    
  } catch (error) {
    console.error('Database health check failed:', error)
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, 
      { status: 503 }
    )
  }
}