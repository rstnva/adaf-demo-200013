import { NextRequest, NextResponse } from 'next/server';
import { 
  ListBacktestsQuery,
  ListBacktestsResponse,
  BacktestSummary,
  BacktestError,
  BacktestStatus,
  Benchmark,
  isValidBacktestStatus
} from '@/types/research';

/**
 * GET /api/research/backtests?limit=50&status=any&orderBy=created_at&orderDir=DESC
 * List backtests with filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters with defaults
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const status = url.searchParams.get('status') || 'any';
    const actor = url.searchParams.get('actor');
    const benchmark = url.searchParams.get('benchmark');
    const orderBy = url.searchParams.get('orderBy') || 'created_at';
    const orderDir = url.searchParams.get('orderDir') || 'DESC';
    
    // Validate parameters
    if (status !== 'any' && !isValidBacktestStatus(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status. Must be: queued, running, done, failed, or any' 
        } as ListBacktestsResponse,
        { status: 400 }
      );
    }
    
    if (!['created_at', 'updated_at', 'name'].includes(orderBy)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid orderBy. Must be: created_at, updated_at, or name' 
        } as ListBacktestsResponse,
        { status: 400 }
      );
    }
    
    if (!['ASC', 'DESC'].includes(orderDir)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid orderDir. Must be: ASC or DESC' 
        } as ListBacktestsResponse,
        { status: 400 }
      );
    }
    
    // Build query object
    const query: ListBacktestsQuery = {
      limit,
      offset,
      status: status === 'any' ? undefined : status as BacktestStatus,
      actor: actor || undefined,
      benchmark: benchmark as Benchmark | undefined,
      orderBy: orderBy as 'created_at' | 'updated_at' | 'name',
      orderDir: orderDir as 'ASC' | 'DESC'
    };
    
    // Mock data generation - in production this would query the database
    const mockBacktests = generateMockBacktests(query);
    const total = 127; // Mock total count
    const hasMore = offset + limit < total;
    
    console.log(`📋 Listed ${mockBacktests.length} backtests (${offset}-${offset + mockBacktests.length} of ${total})`);
    
    const response: ListBacktestsResponse = {
      success: true,
      backtests: mockBacktests,
      total,
      hasMore
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('❌ List backtests error:', error);
    
    if (error instanceof BacktestError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        } as ListBacktestsResponse,
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      } as ListBacktestsResponse,
      { status: 500 }
    );
  }
}

/**
 * Generate mock backtest data for development
 */
function generateMockBacktests(query: ListBacktestsQuery): BacktestSummary[] {
  const results: BacktestSummary[] = [];
  
  // Mock data arrays
  const actors = ['research@adaf.com', 'analyst@adaf.com', 'quant@adaf.com'];
  const benchmarks: Benchmark[] = ['BTC', 'ETH', 'NAV'];
  const statuses: BacktestStatus[] = ['queued', 'running', 'done', 'failed'];
  
  // Generate mock backtests
  for (let i = 0; i < query.limit; i++) {
    const mockIndex = (query.offset + i) % 50; // Rotate through mock data
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isCompleted = status === 'done';
    
    const mockBacktest: BacktestSummary = {
      id: Date.now() + mockIndex,
      name: `Strategy Test ${mockIndex + 1}`,
      status,
      actor: actors[Math.floor(Math.random() * actors.length)],
      benchmark: benchmarks[Math.floor(Math.random() * benchmarks.length)],
      agentCount: Math.floor(1 + Math.random() * 5),
      
      // Timestamps
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      // Performance metrics (only for completed backtests)
      pnlPct: isCompleted ? Number((Math.random() * 0.6 - 0.2).toFixed(4)) : undefined,
      sharpe: isCompleted ? Number((Math.random() * 3).toFixed(2)) : undefined,
      maxDDPct: isCompleted ? Number((Math.random() * -0.3).toFixed(4)) : undefined,
      hitRate: isCompleted ? Number((Math.random() * 0.8 + 0.2).toFixed(3)) : undefined,
      coveragePct: isCompleted ? Number((0.85 + Math.random() * 0.15).toFixed(3)) : undefined,
      runCount: Math.floor(1 + Math.random() * 4),
      
      // Duration info
      durationMs: isCompleted ? Math.floor(30000 + Math.random() * 300000) : undefined,
      lastRunAt: status !== 'queued' ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined
    };
    
    // Apply filters
    if (query.status && mockBacktest.status !== query.status) {
      continue;
    }
    
    if (query.actor && mockBacktest.actor !== query.actor) {
      continue;
    }
    
    if (query.benchmark && mockBacktest.benchmark !== query.benchmark) {
      continue;
    }
    
    results.push(mockBacktest);
    
    if (results.length >= query.limit) {
      break;
    }
  }
  
  // Sort results
  results.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;
    
    switch (query.orderBy) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'updated_at':
        aValue = a.lastRunAt || a.createdAt;
        bValue = b.lastRunAt || b.createdAt;
        break;
      case 'created_at':
      default:
        aValue = a.createdAt;
        bValue = b.createdAt;
        break;
    }
    
    if (query.orderDir === 'ASC') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
  
  return results;
}