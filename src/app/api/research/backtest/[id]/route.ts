import { NextRequest, NextResponse } from 'next/server';
import { 
  GetBacktestResponse,
  Backtest,
  BacktestRun,
  BacktestError
} from '@/types/research';

/**
 * GET /api/research/backtest?id=123
 * Retrieve a specific backtest with its configuration, results, and run history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const idStr = url.searchParams.get('id');
    
    if (!idStr) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: id' 
        } as GetBacktestResponse,
        { status: 400 }
      );
    }
    
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid backtest ID: must be a number' 
        } as GetBacktestResponse,
        { status: 400 }
      );
    }
    
    // Mock backtest data - in production this would query the database
    const mockBacktest = createMockBacktest(id);
    const mockRuns = createMockRuns(id);
    
    if (!mockBacktest) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Backtest with ID ${id} not found` 
        } as GetBacktestResponse,
        { status: 404 }
      );
    }
    
    console.log(`📊 Retrieved backtest ${id}: "${mockBacktest.name}"`);
    
    const response: GetBacktestResponse = {
      success: true,
      backtest: mockBacktest,
      runs: mockRuns
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('❌ Get backtest error:', error);
    
    if (error instanceof BacktestError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        } as GetBacktestResponse,
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while retrieving backtest' 
      } as GetBacktestResponse,
      { status: 500 }
    );
  }
}

/**
 * Create mock backtest data for development/testing
 */
function createMockBacktest(id: number): Backtest | null {
  // Return null for non-existent IDs to test 404 handling
  if (id > 1000000) {
    return null;
  }
  
  const isCompleted = id % 3 === 0; // Every 3rd backtest is completed
  
  return {
    id,
    name: `Strategy Test #${id}`,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    actor: 'research@adaf.com',
    config: {
      name: `Strategy Test #${id}`,
      agents: ['NM-1', 'OF-1', 'OC-1'],
      rules: [
        {
          expr: 'etf.flow.usd > 100000000 AND tvl.change7d > 0.05',
          weight: 0.6,
          description: 'Large ETF inflows with TVL growth'
        },
        {
          expr: 'funding.rate < -0.01 OR volatility.rank < 0.3',
          weight: 0.4,
          description: 'Negative funding or low volatility'
        }
      ],
      window: {
        from: '2025-07-01T00:00:00Z',
        to: '2025-09-01T00:00:00Z'
      },
      feesBps: 5,
      slippageBps: 3,
      sizing: {
        notionalPctNAV: 0.25
      },
      benchmark: 'BTC',
      rebalanceDays: 1
    },
    status: isCompleted ? 'done' : (id % 5 === 0 ? 'failed' : 'queued'),
    results: isCompleted ? {
      kpis: {
        pnlUsd: 125000.50 * (0.5 + Math.random()),
        pnlPct: 0.1847 * (0.5 + Math.random()),
        maxDDPct: -0.0892 * (0.5 + Math.random()),
        sharpe: 1.23 * (0.5 + Math.random()),
        hitRate: 0.634 * (0.8 + Math.random() * 0.4),
        trades: Math.floor(30 + Math.random() * 50),
        volPct: 0.2456 * (0.8 + Math.random() * 0.4),
        vsBenchmarkPct: 0.0423 * (0.5 + Math.random())
      },
      equity: generateMockEquityCurve(),
      monthlyPnL: [
        { ym: '2025-07', pnlPct: 0.0567 * (0.5 + Math.random()) },
        { ym: '2025-08', pnlPct: 0.0823 * (0.5 + Math.random()) }
      ],
      notes: [
        'Data coverage: 94.2% (missing 4 days due to market holidays)',
        'Strategy performed well during high volatility periods'
      ]
    } : undefined,
    durationMs: isCompleted ? Math.floor(1000 + Math.random() * 5000) : undefined,
    dataPoints: isCompleted ? Math.floor(1500 + Math.random() * 1000) : undefined,
    coveragePct: isCompleted ? 90 + Math.random() * 10 : undefined,
    errorMessage: id % 5 === 0 ? 'Insufficient data for the selected time window' : undefined
  };
}

/**
 * Create mock backtest runs for development/testing
 */
function createMockRuns(backtestId: number): BacktestRun[] {
  const runCount = Math.floor(1 + Math.random() * 3); // 1-3 runs
  const runs: BacktestRun[] = [];
  
  for (let i = 0; i < runCount; i++) {
    const startedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    const duration = 1000 + Math.random() * 5000;
    const finishedAt = new Date(new Date(startedAt).getTime() + duration).toISOString();
    
    runs.push({
      id: backtestId * 100 + i + 1,
      backtestId,
      startedAt,
      finishedAt,
      stats: {
        signalsProcessed: Math.floor(1000 + Math.random() * 2000),
        rulesEvaluated: Math.floor(2000 + Math.random() * 4000),
        tradesExecuted: Math.floor(20 + Math.random() * 60),
        dataQualityScore: 0.85 + Math.random() * 0.15,
        executionPhases: {
          dataLoading: Math.floor(200 + Math.random() * 500),
          signalProcessing: Math.floor(800 + Math.random() * 2000),
          pnlCalculation: Math.floor(300 + Math.random() * 800),
          kpiAggregation: Math.floor(100 + Math.random() * 300)
        }
      },
      actor: 'research@adaf.com',
      version: 'v1.0',
      environment: 'production'
    });
  }
  
  return runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

/**
 * Generate mock equity curve data
 */
function generateMockEquityCurve() {
  const points = [];
  const days = 60;
  let stratEquity = 1.0;
  let benchEquity = 1.0;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Generate random daily returns
    const stratReturn = (Math.random() - 0.48) * 0.03; // Slightly positive bias
    const benchReturn = (Math.random() - 0.5) * 0.025;
    
    stratEquity *= (1 + stratReturn);
    benchEquity *= (1 + benchReturn);
    
    points.push({
      ts: date.toISOString(),
      nav: 1.0,
      strat: stratEquity,
      bench: benchEquity
    });
  }
  
  return points;
}