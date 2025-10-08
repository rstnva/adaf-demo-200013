import { NextRequest, NextResponse } from 'next/server';
import { 
  RunBacktestRequest,
  RunBacktestResponse,
  BacktestError,
  Backtest,
  BacktestStatus
} from '@/types/research';
import { BacktestEngine } from '@/services/agents/research/backtester';
import { withRateLimit } from '@/middleware/withRateLimit';/**
 * POST /api/research/backtest/run
 * Execute a backtest synchronously (for demo purposes)
 * Rate limited to 6 requests per minute
 */
async function runBacktestHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as RunBacktestRequest;
    const { id, actor, force } = body;
    
    // Validate input
    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or missing backtest ID' 
        } as RunBacktestResponse,
        { status: 400 }
      );
    }
    
    if (!actor || typeof actor !== 'string' || actor.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or missing actor' 
        } as RunBacktestResponse,
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    
    console.log(`🚀 Starting backtest run ${id} by ${actor}${force ? ' (forced)' : ''}`);
    
    // Mock backtest execution
    // In production, this would:
    // 1. Load backtest configuration from database
    // 2. Validate backtest exists and is runnable
    // 3. Update status to 'running'
    // 4. Execute backtest engine
    // 5. Update results and status to 'done'/'failed'
    
    // Get backtest configuration (in production, query from database)
    const backtest = await getMockBacktest(id);
    if (!backtest) {
      throw new BacktestError(
        `Backtest with id ${id} not found`,
        'NOT_FOUND'
      );
    }

    if (backtest.status !== 'queued') {
      throw new BacktestError(
        `Cannot run backtest with status: ${backtest.status}. Must be 'queued'`,
        'INVALID_STATE'
      );
    }

    // Update status to running (in production, update database)
    console.log(`🚀 Starting real backtest execution for: ${backtest.name}`);

    let status: BacktestStatus = 'running';
    let results;
    let errorMessage;

    try {
      // Run the real backtesting engine
      results = await BacktestEngine.run(backtest.config);
      status = 'done';
      
      console.log(`✅ Backtest execution completed successfully`);
      console.log(`📊 Results: PnL ${(results.kpis.pnlPct * 100).toFixed(2)}%, Sharpe ${results.kpis.sharpe.toFixed(2)}, MaxDD ${(results.kpis.maxDDPct * 100).toFixed(2)}%`);
      
    } catch (error) {
      status = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      console.error(`❌ Backtest execution failed:`, error);
    }

    const durationMs = Date.now() - startTime;

    const response: RunBacktestResponse = {
      success: status === 'done',
      id,
      status,
      results,
      errorMessage,
      durationMs,
      message: status === 'done' 
        ? `Backtest execution completed in ${durationMs}ms` 
        : `Backtest failed: ${errorMessage}`
    };

    // TODO: In production, save results and status to database
    // UPDATE backtests SET status = $1, results = $2, error_message = $3, duration_ms = $4 WHERE id = $5
    // INSERT INTO backtest_runs (backtest_id, started_at, finished_at, stats, actor) VALUES (...)

    return NextResponse.json(response, { status: status === 'done' ? 200 : 500 });
    
  } catch (error) {
    console.error('❌ Run backtest error:', error);
    
    if (error instanceof BacktestError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        } as RunBacktestResponse,
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while running backtest' 
      } as RunBacktestResponse,
      { status: 500 }
    );
  }
}

/**
 * Get mock backtest for development - replace with database query
 */
async function getMockBacktest(id: number): Promise<Backtest | null> {
  // Mock backtest configuration
  return {
    id,
    name: `High-Performance Strategy ${id}`,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    actor: 'research@adaf.com',
    status: 'queued',
    config: {
      name: `Strategy Config ${id}`,
      agents: ['OF-1', 'OC-1', 'DV-1'],
      rules: [
        { 
          expr: 'etf.flow.usd > 100e6 AND tvl.change7d > 0', 
          weight: 0.6,
          description: 'Large ETF inflows with TVL growth' 
        },
        { 
          expr: 'funding.rate < -0.01 OR gamma.exposure > 50e6', 
          weight: 0.4,
          description: 'Negative funding or high gamma exposure'
        }
      ],
      window: {
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        to: new Date().toISOString()
      },
      benchmark: 'BTC',
      sizing: { notionalPctNAV: 0.1 },
      feesBps: 5,
      slippageBps: 3,
      rebalanceDays: 1
    }
  };
}

/**
 * Rate-limited POST handler
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withRateLimit(request, runBacktestHandler);
}