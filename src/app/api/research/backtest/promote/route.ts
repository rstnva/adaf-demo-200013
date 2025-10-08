import { NextRequest, NextResponse } from 'next/server';
import { 
  PromoteBacktestRequest,
  PromoteBacktestResponse,
  BacktestError,
  OpXOpportunity,
  OpXOpportunityStatus
} from '@/types/research';

/**
 * POST /api/research/backtest/promote
 * Promote a successful backtest to an OP-X opportunity
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PromoteBacktestRequest = await request.json();
    
    // Validate required fields
    if (!body.backtestId) {
      throw new BacktestError(
        'Missing required field: backtestId',
        'VALIDATION_ERROR'
      );
    }
    
    if (!body.name || body.name.length < 3) {
      throw new BacktestError(
        'Name must be at least 3 characters long',
        'VALIDATION_ERROR'
      );
    }
    
    if (body.description && body.description.length > 500) {
      throw new BacktestError(
        'Description must be less than 500 characters',
        'VALIDATION_ERROR'
      );
    }
    
    // Validate optional fields
    if (body.confidenceLevel !== undefined && (body.confidenceLevel < 0 || body.confidenceLevel > 1)) {
      throw new BacktestError(
        'Confidence level must be between 0 and 1',
        'VALIDATION_ERROR'
      );
    }
    
    if (body.targetAllocationPct !== undefined && (body.targetAllocationPct <= 0 || body.targetAllocationPct > 1)) {
      throw new BacktestError(
        'Target allocation must be between 0 and 1 (exclusive of 0)',
        'VALIDATION_ERROR'
      );
    }
    
    if (body.priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(body.priority)) {
      throw new BacktestError(
        'Priority must be: LOW, MEDIUM, HIGH, or CRITICAL',
        'VALIDATION_ERROR'
      );
    }
    
    // Mock backtest lookup - in production this would query the database
    const mockBacktest = generateMockBacktest(body.backtestId);
    if (!mockBacktest) {
      throw new BacktestError(
        `Backtest with id ${body.backtestId} not found`,
        'NOT_FOUND'
      );
    }
    
    // Validate backtest is promotable
    if (mockBacktest.status !== 'done') {
      throw new BacktestError(
        `Cannot promote backtest with status: ${mockBacktest.status}. Must be 'done'`,
        'INVALID_STATE'
      );
    }
    
    if (!mockBacktest.results) {
      throw new BacktestError(
        'Cannot promote backtest without results',
        'INVALID_STATE'
      );
    }
    
    // Apply promotion criteria validation
    const { kpis } = mockBacktest.results;
    if (kpis.sharpe < 1.0) {
      throw new BacktestError(
        `Sharpe ratio ${kpis.sharpe.toFixed(2)} is below minimum threshold of 1.0`,
        'PROMOTION_CRITERIA_NOT_MET'
      );
    }
    
    if (kpis.maxDDPct < -0.25) {
      throw new BacktestError(
        `Maximum drawdown ${(kpis.maxDDPct * 100).toFixed(1)}% exceeds maximum threshold of -25%`,
        'PROMOTION_CRITERIA_NOT_MET'
      );
    }
    
    if (kpis.hitRate < 0.55) {
      throw new BacktestError(
        `Hit rate ${(kpis.hitRate * 100).toFixed(1)}% is below minimum threshold of 55%`,
        'PROMOTION_CRITERIA_NOT_MET'
      );
    }
    
    // Generate OP-X opportunity
    const opportunity: OpXOpportunity = {
      id: `opx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: body.name,
      description: body.description || `Promoted from backtest: ${mockBacktest.name}`,
      backtestId: body.backtestId,
      status: 'PENDING_REVIEW' as OpXOpportunityStatus,
      actor: body.actor || 'system@adaf.com',
      
      // Strategy configuration from backtest
      agents: mockBacktest.config.agents,
      benchmark: mockBacktest.config.benchmark,
      
      // Performance metrics
      expectedReturn: kpis.pnlPct,
      expectedSharpe: kpis.sharpe,
      expectedMaxDD: kpis.maxDDPct,
      expectedHitRate: kpis.hitRate,
      
      // Risk management
      confidenceLevel: body.confidenceLevel || 0.85,
      targetAllocationPct: body.targetAllocationPct || 0.05,
      maxDrawdownThreshold: body.maxDrawdownThreshold || -0.15,
      
      // Metadata
      priority: body.priority || 'MEDIUM',
      tags: body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Approval workflow
      reviewRequired: true,
      approvalStatus: 'PENDING',
      reviewers: ['risk@adaf.com', 'portfolio@adaf.com'],
      
      // Simulation parameters
      notionalCapacity: body.notionalCapacity || 10000000, // $10M default
      minHoldingPeriod: body.minHoldingPeriod || 24, // 24 hours default
      maxPositionSize: body.maxPositionSize || 0.1 // 10% of allocation default
    };
    
    console.log(`🚀 Promoted backtest ${body.backtestId} to OP-X opportunity: ${opportunity.id}`);
    
    const response: PromoteBacktestResponse = {
      success: true,
      opportunity,
      message: `Successfully promoted backtest to OP-X opportunity: ${opportunity.id}`
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('❌ Promote backtest error:', error);
    
    if (error instanceof BacktestError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code
        } as PromoteBacktestResponse,
        { status: error.code === 'NOT_FOUND' ? 404 : 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      } as PromoteBacktestResponse,
      { status: 500 }
    );
  }
}

/**
 * Generate mock backtest data for promotion testing
 */
function generateMockBacktest(backtestId: number) {
  // Mock successful backtest with good performance metrics
  return {
    id: backtestId,
    name: `High-Performance Strategy ${backtestId}`,
    status: 'done' as const,
    config: {
      name: `Strategy Config ${backtestId}`,
      agents: ['NM-1', 'OF-1', 'OC-1'],
      rules: [
        { expr: 'etf.flow.usd > 100e6 AND tvl.change7d > 0', weight: 0.6 },
        { expr: 'price.rsi < 30 OR volatility.1h < 0.02', weight: 0.4 }
      ],
      window: {
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z'
      },
      benchmark: 'BTC' as const,
      sizing: { notionalPctNAV: 0.1 }
    },
    results: {
      kpis: {
        pnlUsd: 2456780.50,
        pnlPct: 0.2457,        // 24.57% return
        maxDDPct: -0.18,       // -18% max drawdown  
        sharpe: 1.85,          // Good Sharpe ratio
        hitRate: 0.62,         // 62% hit rate
        trades: 247,
        volPct: 0.15,
        vsBenchmarkPct: 0.089  // 8.9% excess return
      },
      equity: [
        { ts: '2024-01-01T00:00:00Z', nav: 1.0, strat: 1.0, bench: 1.0 },
        { ts: '2024-06-01T00:00:00Z', nav: 1.0, strat: 1.12, bench: 1.08 },
        { ts: '2024-12-31T23:59:59Z', nav: 1.0, strat: 1.2457, bench: 1.1567 }
      ],
      monthlyPnL: [
        { ym: '2024-01', pnlPct: 0.0234 },
        { ym: '2024-02', pnlPct: 0.0189 }
      ]
    }
  };
}