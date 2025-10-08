import { NextRequest, NextResponse } from 'next/server';
import { 
  CreateBacktestRequest, 
  CreateBacktestResponse,
  BacktestConfig,
  ValidationResult,
  ValidationError,
  BacktestError,
  BACKTEST_CONSTRAINTS,
  isValidBenchmark
} from '@/types/research';

/**
 * POST /api/research/backtest
 * Create a new backtest configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as CreateBacktestRequest;
    const { config, actor } = body;
    
    // Validate input structure
    if (!config || !actor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: config and actor are required' 
        } as CreateBacktestResponse,
        { status: 400 }
      );
    }
    
    // Validate configuration
    const validation = validateBacktestConfig(config);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}` 
        } as CreateBacktestResponse,
        { status: 400 }
      );
    }
    
    // Validate actor
    if (!actor || typeof actor !== 'string' || actor.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid actor: must be a non-empty string' 
        } as CreateBacktestResponse,
        { status: 400 }
      );
    }
    
    // For now, use mock implementation
    // In production, this would insert into PostgreSQL database
    const backtestId = Math.floor(Math.random() * 1000000) + Date.now();
    
    console.log(`✓ Created backtest ${backtestId}: "${config.name}" by ${actor}`);
    
    // TODO: Implement database insertion
    // const query = `
    //   INSERT INTO backtests (name, actor, config, status)
    //   VALUES ($1, $2, $3, 'queued')
    //   RETURNING id
    // `;
    // const result = await db.query(query, [config.name, actor, JSON.stringify(config)]);
    // const backtestId = result.rows[0].id;
    
    const response: CreateBacktestResponse = {
      success: true,
      id: backtestId
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('❌ Create backtest error:', error);
    
    if (error instanceof BacktestError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        } as CreateBacktestResponse,
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while creating backtest' 
      } as CreateBacktestResponse,
      { status: 500 }
    );
  }
}

/**
 * Validate backtest configuration against business rules
 */
function validateBacktestConfig(config: BacktestConfig): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate name
  if (!config.name || typeof config.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Name is required and must be a string',
      code: 'REQUIRED'
    });
  } else if (config.name.length < BACKTEST_CONSTRAINTS.NAME.MIN_LENGTH || 
             config.name.length > BACKTEST_CONSTRAINTS.NAME.MAX_LENGTH) {
    errors.push({
      field: 'name',
      message: `Name must be between ${BACKTEST_CONSTRAINTS.NAME.MIN_LENGTH} and ${BACKTEST_CONSTRAINTS.NAME.MAX_LENGTH} characters`,
      code: 'OUT_OF_RANGE'
    });
  }
  
  // Validate agents
  if (!Array.isArray(config.agents) || config.agents.length === 0) {
    errors.push({
      field: 'agents',
      message: 'At least one agent is required',
      code: 'REQUIRED'
    });
  } else if (config.agents.length > BACKTEST_CONSTRAINTS.AGENTS.MAX_COUNT) {
    errors.push({
      field: 'agents',
      message: `Maximum ${BACKTEST_CONSTRAINTS.AGENTS.MAX_COUNT} agents allowed`,
      code: 'OUT_OF_RANGE'
    });
  } else if (config.agents.some(agent => !agent || typeof agent !== 'string')) {
    errors.push({
      field: 'agents',
      message: 'All agents must be non-empty strings',
      code: 'INVALID_FORMAT'
    });
  }
  
  // Validate rules
  if (!Array.isArray(config.rules) || config.rules.length === 0) {
    errors.push({
      field: 'rules',
      message: 'At least one rule is required',
      code: 'REQUIRED'
    });
  } else if (config.rules.length > BACKTEST_CONSTRAINTS.RULES.MAX_COUNT) {
    errors.push({
      field: 'rules',
      message: `Maximum ${BACKTEST_CONSTRAINTS.RULES.MAX_COUNT} rules allowed`,
      code: 'OUT_OF_RANGE'
    });
  } else {
    config.rules.forEach((rule, index) => {
      if (!rule.expr || typeof rule.expr !== 'string') {
        errors.push({
          field: `rules[${index}].expr`,
          message: 'Rule expression is required and must be a string',
          code: 'REQUIRED'
        });
      }
      
      if (rule.weight !== undefined) {
        if (typeof rule.weight !== 'number' || rule.weight < 0 || rule.weight > 1) {
          errors.push({
            field: `rules[${index}].weight`,
            message: 'Rule weight must be a number between 0 and 1',
            code: 'OUT_OF_RANGE'
          });
        }
      }
    });
  }
  
  // Validate window
  if (!config.window || !config.window.from || !config.window.to) {
    errors.push({
      field: 'window',
      message: 'Window with from and to dates is required',
      code: 'REQUIRED'
    });
  } else {
    const fromDate = new Date(config.window.from);
    const toDate = new Date(config.window.to);
    
    if (isNaN(fromDate.getTime())) {
      errors.push({
        field: 'window.from',
        message: 'Invalid from date format. Use ISO timestamp',
        code: 'INVALID_FORMAT'
      });
    }
    
    if (isNaN(toDate.getTime())) {
      errors.push({
        field: 'window.to',
        message: 'Invalid to date format. Use ISO timestamp',
        code: 'INVALID_FORMAT'
      });
    }
    
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      if (fromDate >= toDate) {
        errors.push({
          field: 'window',
          message: 'From date must be before to date',
          code: 'OUT_OF_RANGE'
        });
      }
      
      const daysDiff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < BACKTEST_CONSTRAINTS.WINDOW.MIN_DAYS) {
        errors.push({
          field: 'window',
          message: `Minimum window is ${BACKTEST_CONSTRAINTS.WINDOW.MIN_DAYS} days`,
          code: 'OUT_OF_RANGE'
        });
      }
      
      if (daysDiff > BACKTEST_CONSTRAINTS.WINDOW.MAX_DAYS) {
        errors.push({
          field: 'window',
          message: `Maximum window is ${BACKTEST_CONSTRAINTS.WINDOW.MAX_DAYS} days`,
          code: 'OUT_OF_RANGE'
        });
      }
    }
  }
  
  // Validate fees
  if (config.feesBps !== undefined) {
    if (typeof config.feesBps !== 'number' || 
        config.feesBps < BACKTEST_CONSTRAINTS.FEES.MIN_BPS || 
        config.feesBps > BACKTEST_CONSTRAINTS.FEES.MAX_BPS) {
      errors.push({
        field: 'feesBps',
        message: `Fees must be between ${BACKTEST_CONSTRAINTS.FEES.MIN_BPS} and ${BACKTEST_CONSTRAINTS.FEES.MAX_BPS} basis points`,
        code: 'OUT_OF_RANGE'
      });
    }
  }
  
  // Validate slippage
  if (config.slippageBps !== undefined) {
    if (typeof config.slippageBps !== 'number' || 
        config.slippageBps < BACKTEST_CONSTRAINTS.SLIPPAGE.MIN_BPS || 
        config.slippageBps > BACKTEST_CONSTRAINTS.SLIPPAGE.MAX_BPS) {
      errors.push({
        field: 'slippageBps',
        message: `Slippage must be between ${BACKTEST_CONSTRAINTS.SLIPPAGE.MIN_BPS} and ${BACKTEST_CONSTRAINTS.SLIPPAGE.MAX_BPS} basis points`,
        code: 'OUT_OF_RANGE'
      });
    }
  }
  
  // Validate sizing
  if (!config.sizing || typeof config.sizing.notionalPctNAV !== 'number') {
    errors.push({
      field: 'sizing.notionalPctNAV',
      message: 'Sizing notionalPctNAV is required and must be a number',
      code: 'REQUIRED'
    });
  } else if (config.sizing.notionalPctNAV < BACKTEST_CONSTRAINTS.SIZING.MIN_PCT || 
             config.sizing.notionalPctNAV > BACKTEST_CONSTRAINTS.SIZING.MAX_PCT) {
    errors.push({
      field: 'sizing.notionalPctNAV',
      message: `Sizing must be between ${BACKTEST_CONSTRAINTS.SIZING.MIN_PCT * 100}% and ${BACKTEST_CONSTRAINTS.SIZING.MAX_PCT * 100}%`,
      code: 'OUT_OF_RANGE'
    });
  }
  
  // Validate benchmark
  if (!config.benchmark || !isValidBenchmark(config.benchmark)) {
    errors.push({
      field: 'benchmark',
      message: 'Benchmark must be one of: BTC, ETH, NAV',
      code: 'INVALID_FORMAT'
    });
  }
  
  // Validate rebalance days
  if (config.rebalanceDays !== undefined) {
    if (typeof config.rebalanceDays !== 'number' || 
        config.rebalanceDays < BACKTEST_CONSTRAINTS.REBALANCE.MIN_DAYS || 
        config.rebalanceDays > BACKTEST_CONSTRAINTS.REBALANCE.MAX_DAYS) {
      errors.push({
        field: 'rebalanceDays',
        message: `Rebalance days must be between ${BACKTEST_CONSTRAINTS.REBALANCE.MIN_DAYS} and ${BACKTEST_CONSTRAINTS.REBALANCE.MAX_DAYS}`,
        code: 'OUT_OF_RANGE'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}