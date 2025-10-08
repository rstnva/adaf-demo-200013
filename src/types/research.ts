// ================================================================================================
// Módulo I — Research & Backtesting Types
// ================================================================================================
// TypeScript definitions for strategy backtesting, research sandbox, and performance measurement
// Strict types without 'any' for signal-based strategy evaluation
// ================================================================================================

// =============================================================================
// Core Backtesting Types
// =============================================================================

export type Benchmark = 'BTC' | 'ETH' | 'NAV';

export type BacktestStatus = 'queued' | 'running' | 'done' | 'failed';

export interface RuleExpr {
  expr: string;         // DSL expression (e.g., "etf.flow.usd > 100e6 AND tvl.change7d > 0")
  weight?: number;      // 0..1 (default 1)
  description?: string; // Optional human-readable description
}

export interface BacktestConfig {
  name: string;
  agents: string[];     // Agent codes (e.g., ['NM-1', 'OF-1', 'OC-1'])
  rules: RuleExpr[];
  window: { 
    from: string;       // ISO timestamp
    to: string;         // ISO timestamp
  };
  feesBps?: number;     // Round-trip fees in basis points (default 5)
  slippageBps?: number; // Slippage per trade in basis points (default 3)
  sizing: { 
    notionalPctNAV: number;  // Position size as % of NAV (0..1)
  };
  benchmark: Benchmark;
  rebalanceDays?: number;    // Days between rebalancing (default 1)
}

export interface BacktestKpis {
  pnlUsd: number;           // Absolute PnL in USD
  pnlPct: number;           // Percentage return
  maxDDPct: number;         // Maximum drawdown (negative value)
  sharpe: number;           // Sharpe ratio (annualized)
  hitRate: number;          // Win rate (wins/total trades)
  trades: number;           // Total number of trades
  volPct: number;           // Annualized volatility
  vsBenchmarkPct: number;   // Excess return vs benchmark
}

export interface EquityPoint {
  ts: string;               // ISO timestamp
  nav: number;              // Base NAV (usually 1.0)
  strat: number;            // Strategy equity curve
  bench: number;            // Benchmark equity curve
}

export interface MonthlyPnL {
  ym: string;               // YYYY-MM format
  pnlPct: number;           // Monthly return percentage
}

export interface BacktestResults {
  kpis: BacktestKpis;
  equity: EquityPoint[];
  monthlyPnL: MonthlyPnL[];
  notes?: string[];         // Warnings, data quality issues, etc.
}

export interface Backtest {
  id: number;
  name: string;
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
  actor: string;
  config: BacktestConfig;
  status: BacktestStatus;
  results?: BacktestResults;
  logs?: string;
  errorMessage?: string;
  durationMs?: number;
  dataPoints?: number;
  coveragePct?: number;     // Data coverage percentage
}

export interface BacktestRun {
  id: number;
  backtestId: number;
  startedAt: string;        // ISO timestamp
  finishedAt?: string;      // ISO timestamp
  stats?: BacktestRunStats;
  actor: string;
  version?: string;
  environment?: string;
}

export interface BacktestRunStats {
  signalsProcessed: number;
  rulesEvaluated: number;
  tradesExecuted: number;
  dataQualityScore: number; // 0..1
  executionPhases: {
    dataLoading: number;    // Milliseconds
    signalProcessing: number;
    pnlCalculation: number;
    kpiAggregation: number;
  };
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateBacktestRequest {
  config: BacktestConfig;
  actor: string;
}

export interface CreateBacktestResponse {
  success: boolean;
  id?: number;
  error?: string;
}

export interface RunBacktestRequest {
  id: number;
  actor: string;
  force?: boolean;          // Force rerun if already done
}

export interface RunBacktestResponse {
  success: boolean;
  id?: number;
  status?: BacktestStatus;
  results?: BacktestResults;
  errorMessage?: string;
  durationMs?: number;
  message?: string;
  error?: string;
}

export interface GetBacktestResponse {
  success: boolean;
  backtest?: Backtest;
  runs?: BacktestRun[];
  error?: string;
}

export interface ListBacktestsQuery {
  limit?: number;           // Default 50, max 200
  offset?: number;          // Default 0
  status?: BacktestStatus | 'any'; // Default 'any'
  actor?: string;
  benchmark?: Benchmark;
  orderBy?: 'created_at' | 'updated_at' | 'name';
  orderDir?: 'ASC' | 'DESC';
}

export interface BacktestSummary {
  id: number;
  name: string;
  status: BacktestStatus;
  createdAt: string;
  actor: string;
  benchmark: Benchmark;
  agentCount: number;
  pnlPct?: number;
  sharpe?: number;
  maxDDPct?: number;
  hitRate?: number;
  coveragePct?: number;
  durationMs?: number;
  runCount: number;
  lastRunAt?: string;
}

export interface ListBacktestsResponse {
  success: boolean;
  backtests?: BacktestSummary[];
  total?: number;
  hasMore?: boolean;
  error?: string;
}

export interface PromoteBacktestRequest {
  backtestId: number;
  name: string;
  description?: string;
  actor?: string;
  confidenceLevel?: number;     // 0..1
  targetAllocationPct?: number; // 0..1
  maxDrawdownThreshold?: number; // negative value
  priority?: OpXPriority;
  tags?: string[];
  notionalCapacity?: number;    // USD
  minHoldingPeriod?: number;    // hours
  maxPositionSize?: number;     // 0..1 (% of allocation)
}

export interface PromoteBacktestResponse {
  success: boolean;
  opportunity?: OpXOpportunity;
  message?: string;
  error?: string;
  code?: string;
}

// =============================================================================
// OP-X Opportunity Types
// =============================================================================

export type OpXOpportunityStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type OpXPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OpXOpportunity {
  id: string;
  name: string;
  description: string;
  backtestId: number;
  status: OpXOpportunityStatus;
  actor: string;
  
  // Strategy configuration
  agents: string[];
  benchmark: Benchmark;
  
  // Performance expectations
  expectedReturn: number;
  expectedSharpe: number;
  expectedMaxDD: number;
  expectedHitRate: number;
  
  // Risk management
  confidenceLevel: number;
  targetAllocationPct: number;
  maxDrawdownThreshold: number;
  
  // Metadata
  priority: OpXPriority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  
  // Approval workflow
  reviewRequired: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewers: string[];
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Simulation parameters
  notionalCapacity: number;
  minHoldingPeriod: number;
  maxPositionSize: number;
}

// =============================================================================
// DSL Parser Types
// =============================================================================

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type LogicalOperator = 'AND' | 'OR';

export interface ParsedExpression {
  field: string;            // e.g., "etf.flow.usd"
  operator: ComparisonOperator;
  value: number | string;
  dataType: 'number' | 'string';
}

export interface ParsedRule {
  expressions: ParsedExpression[];
  operators: LogicalOperator[];
  weight: number;
  originalExpr: string;
}

// =============================================================================
// Signal Processing Types
// =============================================================================

export interface SignalData {
  ts: string;               // ISO timestamp
  agentCode: string;
  signalType: string;
  data: Record<string, unknown>; // Flexible signal data structure
}

export interface ProcessedSignal {
  date: string;             // YYYY-MM-DD format
  signals: SignalData[];
  aggregated: Record<string, number>; // Aggregated metrics for rule evaluation
}

export interface PositionSignal {
  date: string;             // YYYY-MM-DD format
  targetPosition: number;   // 0..1 (percentage of NAV)
  signals: string[];        // Contributing signal descriptions
  confidence: number;       // 0..1 confidence score
}

// =============================================================================
// Performance Calculation Types
// =============================================================================

export interface DailyReturn {
  date: string;             // YYYY-MM-DD format
  stratReturn: number;      // Strategy daily return
  benchReturn: number;      // Benchmark daily return
  position: number;         // Position size (0..1)
  trades: number;           // Number of trades executed
  fees: number;             // Fees paid
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;       // Annualized
  sharpeRatio: number;
  maxDrawdown: number;
  calmarRatio: number;      // Annual return / max drawdown
  sortinoRatio: number;     // Downside deviation adjusted
  winRate: number;          // Percentage of positive periods
  avgWin: number;           // Average winning return
  avgLoss: number;          // Average losing return
  profitFactor: number;     // Gross profit / gross loss
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: 'REQUIRED' | 'INVALID_FORMAT' | 'OUT_OF_RANGE' | 'INVALID_EXPR';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

// =============================================================================
// Configuration Constraints
// =============================================================================

export const BACKTEST_CONSTRAINTS = {
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200
  },
  WINDOW: {
    MIN_DAYS: 7,
    MAX_DAYS: 1095 // ~3 years
  },
  FEES: {
    MIN_BPS: 0,
    MAX_BPS: 100 // 1%
  },
  SLIPPAGE: {
    MIN_BPS: 0,
    MAX_BPS: 50 // 0.5%
  },
  SIZING: {
    MIN_PCT: 0.01, // 1%
    MAX_PCT: 1.0   // 100%
  },
  REBALANCE: {
    MIN_DAYS: 1,
    MAX_DAYS: 30
  },
  RULES: {
    MIN_COUNT: 1,
    MAX_COUNT: 10
  },
  AGENTS: {
    MIN_COUNT: 1,
    MAX_COUNT: 20
  }
} as const;

// =============================================================================
// Error Types
// =============================================================================

export class BacktestError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BacktestError';
  }
}

export class DSLParseError extends BacktestError {
  constructor(expression: string, position?: number, details?: string) {
    super(
      `Failed to parse DSL expression: ${expression}${details ? ` - ${details}` : ''}`,
      'DSL_PARSE_ERROR',
      { expression, position, details }
    );
    this.name = 'DSLParseError';
  }
}

export class DataQualityError extends BacktestError {
  constructor(message: string, coveragePct: number, missingDays: number) {
    super(message, 'DATA_QUALITY_ERROR', { coveragePct, missingDays });
    this.name = 'DataQualityError';
  }
}

// =============================================================================
// Type Guards
// =============================================================================

export function isValidBenchmark(value: string): value is Benchmark {
  return ['BTC', 'ETH', 'NAV'].includes(value);
}

export function isValidBacktestStatus(value: string): value is BacktestStatus {
  return ['queued', 'running', 'done', 'failed'].includes(value);
}

export function isValidComparisonOperator(value: string): value is ComparisonOperator {
  return ['>', '<', '>=', '<=', '==', '!='].includes(value);
}

export function isValidLogicalOperator(value: string): value is LogicalOperator {
  return ['AND', 'OR'].includes(value);
}

// =============================================================================
// Utility Types
// =============================================================================

export type BacktestConfigPartial = Partial<BacktestConfig> & {
  name: string;
  agents: string[];
  rules: RuleExpr[];
  window: { from: string; to: string };
  sizing: { notionalPctNAV: number };
  benchmark: Benchmark;
};

export type CreateBacktestData = Omit<Backtest, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: BacktestStatus;
};

export type UpdateBacktestData = Partial<Pick<Backtest, 'status' | 'results' | 'logs' | 'errorMessage' | 'durationMs' | 'dataPoints' | 'coveragePct'>>;

// =============================================================================
// All types are exported above with their individual export statements
// =============================================================================