import { registry } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Generate metrics
    const body = await registry.metrics()
    
    // Get system metrics
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    // Add ADAF-specific metrics
    const adafMetrics = `
# HELP adaf_rate_limit_block_total Total number of requests blocked by rate limiting
# TYPE adaf_rate_limit_block_total counter
adaf_rate_limit_block_total{route="/api/actions"} 0
adaf_rate_limit_block_total{route="/api/research/backtest/run"} 0
adaf_rate_limit_block_total{route="/api/control"} 0

# HELP adaf_system_info System information
# TYPE adaf_system_info gauge
adaf_system_info{version="${process.env.npm_package_version || '1.0.0'}",environment="${process.env.NODE_ENV || 'development'}",app_env="${process.env.APP_ENV || 'unknown'}"} 1

# HELP adaf_memory_usage_bytes Memory usage in bytes
# TYPE adaf_memory_usage_bytes gauge
adaf_memory_usage_bytes{type="rss"} ${memUsage.rss}
adaf_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}
adaf_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}
adaf_memory_usage_bytes{type="external"} ${memUsage.external}

# HELP adaf_uptime_seconds Application uptime in seconds
# TYPE adaf_uptime_seconds gauge
adaf_uptime_seconds ${uptime}

# HELP adaf_wsp_data_freshness_seconds Age of Wall Street Pulse data in seconds
# TYPE adaf_wsp_data_freshness_seconds gauge
adaf_wsp_data_freshness_seconds{data_type="etf_flows"} 0
adaf_wsp_data_freshness_seconds{data_type="funding_gamma"} 0
adaf_wsp_data_freshness_seconds{data_type="market_data"} 0

`;

    return new Response(adafMetrics + body, {
      status: 200,
      headers: { 
        'Content-Type': registry.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    })
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return new Response('Error generating metrics', { status: 500 });
  }
}
