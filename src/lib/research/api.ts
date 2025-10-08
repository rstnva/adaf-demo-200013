// ================================================================================================
// Research API Client
// ================================================================================================
// Typed API client for research/backtesting operations with comprehensive error handling
// ================================================================================================

import { 
  CreateBacktestRequest, 
  CreateBacktestResponse,
  RunBacktestRequest,
  RunBacktestResponse,
  GetBacktestResponse,
  ListBacktestsResponse,
  ListBacktestsQuery,
  PromoteBacktestRequest,
  PromoteBacktestResponse,
  BacktestConfig,
  Backtest,
  BacktestSummary
} from '@/types/research';

/**
 * API client configuration
 */
const API_BASE = '/api/research';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * API error class for typed error handling
 */
export class ResearchApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ResearchApiError';
  }
}

/**
 * HTTP client with timeout and error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.code) {
          errorCode = errorData.code;
        }
      } catch {
        // Ignore JSON parse errors for error responses
      }

      throw new ResearchApiError(errorMessage, response.status, errorCode);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ResearchApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ResearchApiError('Request timeout', 408);
    }

    throw new ResearchApiError(
      error instanceof Error ? error.message : 'Unknown network error',
      0
    );
  }
}

/**
 * Research API client
 */
export class ResearchApi {
  /**
   * Create a new backtest configuration
   */
  static async createBacktest(request: CreateBacktestRequest): Promise<CreateBacktestResponse> {
    return apiRequest<CreateBacktestResponse>('/backtest', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Run a backtest execution
   */
  static async runBacktest(request: RunBacktestRequest): Promise<RunBacktestResponse> {
    return apiRequest<RunBacktestResponse>('/backtest/run', {
      method: 'POST',
      body: JSON.stringify(request),
    }, 120000); // 2 minutes timeout for backtest execution
  }

  /**
   * Get backtest details by ID
   */
  static async getBacktest(id: number): Promise<GetBacktestResponse> {
    return apiRequest<GetBacktestResponse>(`/backtest/${id}`);
  }

  /**
   * List backtests with filtering and pagination
   */
  static async listBacktests(query: ListBacktestsQuery = {}): Promise<ListBacktestsResponse> {
    const params = new URLSearchParams();
    
    if (query.limit !== undefined) params.append('limit', query.limit.toString());
    if (query.offset !== undefined) params.append('offset', query.offset.toString());
    if (query.status !== undefined) params.append('status', query.status);
    if (query.actor) params.append('actor', query.actor);
    if (query.benchmark) params.append('benchmark', query.benchmark);
    if (query.orderBy) params.append('orderBy', query.orderBy);
    if (query.orderDir) params.append('orderDir', query.orderDir);

    const queryString = params.toString();
    const endpoint = `/backtests${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<ListBacktestsResponse>(endpoint);
  }

  /**
   * Promote backtest to OP-X opportunity
   */
  static async promoteBacktest(request: PromoteBacktestRequest): Promise<PromoteBacktestResponse> {
    return apiRequest<PromoteBacktestResponse>('/backtest/promote', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Validate backtest configuration
   */
  static validateConfig(config: BacktestConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.name?.trim()) {
      errors.push('Name is required');
    }

    if (!config.agents || config.agents.length === 0) {
      errors.push('At least one agent is required');
    }

    if (!config.rules || config.rules.length === 0) {
      errors.push('At least one rule is required');
    }

    // Date validation
    if (!config.window.from || !config.window.to) {
      errors.push('Date range (from/to) is required');
    } else {
      const fromDate = new Date(config.window.from);
      const toDate = new Date(config.window.to);
      
      if (fromDate >= toDate) {
        errors.push('From date must be before to date');
      }

      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
      if (daysDiff < 7) {
        errors.push('Date range must be at least 7 days');
      }
      
      if (daysDiff > 730) {
        errors.push('Date range cannot exceed 2 years');
      }
    }

    // Rules validation
    for (let i = 0; i < config.rules.length; i++) {
      const rule = config.rules[i];
      if (!rule.expr?.trim()) {
        errors.push(`Rule ${i + 1}: Expression is required`);
      }
      
      if (rule.weight !== undefined && (rule.weight <= 0 || rule.weight > 10)) {
        errors.push(`Rule ${i + 1}: Weight must be between 0 and 10`);
      }
    }

    // Sizing validation
    if (config.sizing.notionalPctNAV <= 0 || config.sizing.notionalPctNAV > 1) {
      errors.push('Position size must be between 0% and 100%');
    }

    // Fees validation
    if (config.feesBps !== undefined && (config.feesBps < 0 || config.feesBps > 1000)) {
      errors.push('Fees must be between 0 and 1000 basis points');
    }

    if (config.slippageBps !== undefined && (config.slippageBps < 0 || config.slippageBps > 1000)) {
      errors.push('Slippage must be between 0 and 1000 basis points');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if backtest can be promoted to OP-X
   */
  static canPromote(backtest: Backtest): { canPromote: boolean; reason?: string } {
    if (backtest.status !== 'done') {
      return { canPromote: false, reason: 'Backtest must be completed' };
    }

    if (!backtest.results?.kpis) {
      return { canPromote: false, reason: 'Backtest results not available' };
    }

    const { kpis } = backtest.results;

    if (kpis.sharpe < 1.0) {
      return { 
        canPromote: false, 
        reason: `Sharpe ratio ${kpis.sharpe.toFixed(2)} below minimum (1.0)` 
      };
    }

    if (kpis.maxDDPct < -0.25) {
      return { 
        canPromote: false, 
        reason: `Max drawdown ${(kpis.maxDDPct * 100).toFixed(1)}% exceeds limit (-25%)` 
      };
    }

    if (kpis.hitRate < 0.55) {
      return { 
        canPromote: false, 
        reason: `Hit rate ${(kpis.hitRate * 100).toFixed(1)}% below minimum (55%)` 
      };
    }

    return { canPromote: true };
  }

  /**
   * Format KPI values for display
   */
  static formatKpi(value: number, type: 'percentage' | 'ratio' | 'count' | 'currency'): string {
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(3);
      case 'count':
        return Math.round(value).toLocaleString();
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      default:
        return value.toString();
    }
  }
}

/**
 * Strategy presets for quick configuration
 */
export const STRATEGY_PRESETS = {
  'etf-spike': {
    name: 'ETF Spike Strategy',
    description: 'Captures large ETF inflow events',
    agents: ['OF-1'],
    rules: [{
      expr: 'etf.flow.usd > 150e6',
      weight: 1,
      description: 'Large ETF inflows above $150M'
    }],
    benchmark: 'BTC' as const
  },
  'tvl-momentum': {
    name: 'TVL Momentum Strategy', 
    description: 'Follows total value locked growth trends',
    agents: ['OC-1'],
    rules: [{
      expr: 'tvl.change7d > 0',
      weight: 1,
      description: 'Positive TVL growth over 7 days'
    }],
    benchmark: 'ETH' as const
  },
  'negative-funding': {
    name: 'Negative Funding Basis Strategy',
    description: 'Exploits negative funding rate environments',
    agents: ['DV-1'],
    rules: [{
      expr: 'funding.rate < 0',
      weight: 1,
      description: 'Negative funding rates indicate bullish sentiment'
    }],
    benchmark: 'BTC' as const
  }
};

/**
 * Available agent codes with descriptions
 */
export const AGENT_OPTIONS = [
  { code: 'NM-1', name: 'News & Market Sentiment', description: 'Social sentiment and news analysis' },
  { code: 'OF-1', name: 'ETF Flows', description: 'Spot ETF inflow/outflow tracking' },
  { code: 'OC-1', name: 'On-Chain Analytics', description: 'DeFi TVL and on-chain metrics' },
  { code: 'DV-1', name: 'Derivatives Volume', description: 'Futures and options analysis' },
  { code: 'DV-2', name: 'Derivatives Structure', description: 'Gamma and options flow' },
  { code: 'MX-1', name: 'Market Microstructure', description: 'Order book and execution analytics' }
];

/**
 * Benchmark options with descriptions
 */
export const BENCHMARK_OPTIONS = [
  { code: 'BTC', name: 'Bitcoin', description: 'Bitcoin price performance' },
  { code: 'ETH', name: 'Ethereum', description: 'Ethereum price performance' },
  { code: 'NAV', name: 'Cash/NAV', description: 'Flat benchmark (no market exposure)' }
] as const;