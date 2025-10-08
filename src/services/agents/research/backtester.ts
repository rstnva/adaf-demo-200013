// ================================================================================================
// Backtesting Engine
// ================================================================================================
// Main orchestrator for backtesting operations - combines signal processing, rule evaluation,
// position management, and performance calculation into a complete backtesting pipeline
// ================================================================================================

import { BacktestConfig, BacktestResults, BacktestKpis, EquityPoint, MonthlyPnL, Benchmark } from '@/types/research';
import { DSLParser, ParsedRule } from './dsl';
import { MetricsCalculator, TradeExecution, DataQualityUtils } from './metrics';
import { BenchmarkService, BenchmarkData } from './benchmarks';
import { PnLSimulator, TradingCosts, PositionSizing, DailyPnL } from './pnl';

/**
 * Signal data structure for daily aggregation
 */
interface DailySignalData {
  date: string;
  agentData: Record<string, Record<string, any>>;
  aggregatedScore: number;
}

/**
 * Backtest execution context
 */
interface BacktestContext {
  config: BacktestConfig;
  signalData: DailySignalData[];
  benchmarkData: BenchmarkData[];
  parsedRules: ParsedRule[];
  simulator: PnLSimulator;
}

/**
 * Main backtesting engine
 */
export class BacktestEngine {
  /**
   * Execute a complete backtest
   */
  static async run(config: BacktestConfig): Promise<BacktestResults> {
    console.log(`🚀 Starting backtest: ${config.name}`);
    const startTime = Date.now();

    try {
      // Validate configuration
      this.validateConfig(config);

      // Parse rules
      const parsedRules = this.parseRules(config.rules);
      console.log(`📋 Parsed ${parsedRules.length} rules`);

      // Generate time grid
      const timeGrid = this.generateTimeGrid(config.window.from, config.window.to);
      console.log(`📅 Generated ${timeGrid.length} day time grid`);

      // Load signal data
      const signalData = await this.loadSignalData(config.agents, timeGrid);
      console.log(`📡 Loaded signal data for ${signalData.length} days`);

      // Load benchmark data
      const benchmarkData = await BenchmarkService.getBenchmarkReturns(
        config.benchmark,
        config.window.from,
        config.window.to
      );
      console.log(`📈 Loaded ${benchmarkData.length} benchmark data points`);

      // Initialize simulator
      const costs: TradingCosts = {
        feesBps: config.feesBps || 5,
        slippageBps: config.slippageBps || 3
      };

      const sizing: PositionSizing = {
        notionalPctNAV: config.sizing.notionalPctNAV
      };

      const simulator = new PnLSimulator(1.0, costs, sizing);

      // Create execution context
      const context: BacktestContext = {
        config,
        signalData,
        benchmarkData,
        parsedRules,
        simulator
      };

      // Execute backtest simulation
      const results = await this.executeBacktest(context);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Backtest completed in ${duration}ms`);

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Backtest failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Validate backtest configuration
   */
  private static validateConfig(config: BacktestConfig): void {
    if (!config.name || config.name.length === 0) {
      throw new Error('Backtest name is required');
    }

    if (!config.agents || config.agents.length === 0) {
      throw new Error('At least one agent is required');
    }

    if (!config.rules || config.rules.length === 0) {
      throw new Error('At least one rule is required');
    }

    if (!config.window.from || !config.window.to) {
      throw new Error('Time window (from/to) is required');
    }

    const fromDate = new Date(config.window.from);
    const toDate = new Date(config.window.to);

    if (fromDate >= toDate) {
      throw new Error('From date must be before to date');
    }

    if (config.sizing.notionalPctNAV <= 0 || config.sizing.notionalPctNAV > 1) {
      throw new Error('Notional % of NAV must be between 0 and 1');
    }
  }

  /**
   * Parse and validate rules
   */
  private static parseRules(rules: { expr: string; weight?: number; description?: string }[]): ParsedRule[] {
    const parsedRules: ParsedRule[] = [];

    for (const rule of rules) {
      try {
        const parsed = DSLParser.parseRule(rule.expr, rule.weight || 1);
        parsedRules.push(parsed);
      } catch (error) {
        throw new Error(`Failed to parse rule "${rule.expr}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return parsedRules;
  }

  /**
   * Generate daily time grid for backtest period
   */
  private static generateTimeGrid(fromDate: string, toDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    let current = new Date(start);
    current.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    // Remove duplicates and sort
    return [...new Set(dates)].sort();
  }

  /**
   * Load and aggregate signal data by day
   */
  private static async loadSignalData(agents: string[], timeGrid: string[]): Promise<DailySignalData[]> {
    const signalData: DailySignalData[] = [];

    for (const date of timeGrid) {
      const dayData: DailySignalData = {
        date,
        agentData: {},
        aggregatedScore: 0
      };

      // Load signals for each agent for this day
      for (const agentCode of agents) {
        const agentSignals = await this.loadAgentSignalsForDay(agentCode, date);
        dayData.agentData[agentCode] = agentSignals;
      }

      signalData.push(dayData);
    }

    return signalData;
  }

  /**
   * Load signals for a specific agent and day
   */
  private static async loadAgentSignalsForDay(agentCode: string, date: string): Promise<Record<string, any>> {
    // TODO: Replace with actual database query
    // SELECT type, metadata, ts
    // FROM signals 
    // WHERE agent_code = $1 
    //   AND DATE(ts) = $2
    // ORDER BY ts DESC

    // Mock implementation - in production, query the signals table
    console.warn(`⚠️ Using mock signal data for ${agentCode} on ${date} - implement database query`);
    
    return this.generateMockSignalData(agentCode, date);
  }

  /**
   * Generate mock signal data for development
   */
  private static generateMockSignalData(agentCode: string, date: string): Record<string, any> {
    const mockData: Record<string, any> = {};

    // Generate realistic signal data based on agent type
    switch (agentCode) {
      case 'OF-1': // ETF Flow agent
        mockData.etf = {
          flow: {
            usd: (Math.random() - 0.5) * 200e6, // ±200M flow
            net: (Math.random() - 0.5) * 50e6,
            '5min': (Math.random() - 0.5) * 10e6
          }
        };
        break;

      case 'OC-1': // On-chain agent
        mockData.tvl = {
          total: 50e9 + Math.random() * 10e9,
          change7d: (Math.random() - 0.5) * 0.2, // ±20% weekly change
          change1d: (Math.random() - 0.5) * 0.05  // ±5% daily change
        };
        mockData.onchain = {
          active_addresses: 800000 + Math.random() * 200000,
          tx_count: 250000 + Math.random() * 50000,
          fees_usd: 5e6 + Math.random() * 2e6
        };
        break;

      case 'DV-1': // Derivatives agent
        mockData.funding = {
          rate: (Math.random() - 0.5) * 0.001, // ±0.1% funding
          oi: 2e9 + Math.random() * 5e8        // Open interest
        };
        mockData.gamma = {
          exposure: (Math.random() - 0.5) * 100e6
        };
        break;

      case 'NM-1': // News/Market agent  
        mockData.news = {
          sentiment_score: Math.random() * 2 - 1 // -1 to 1
        };
        mockData.social = {
          sentiment_score: Math.random() * 2 - 1
        };
        mockData.price = {
          close: 45000 + Math.random() * 10000,
          rsi_14: 30 + Math.random() * 40 // 30-70 RSI range
        };
        break;

      default:
        // Generic agent data
        mockData.generic = {
          signal_strength: Math.random(),
          confidence: 0.5 + Math.random() * 0.5
        };
    }

    // Add some common market data
    mockData.volatility = {
      '1h': 0.01 + Math.random() * 0.03,
      '24h': 0.02 + Math.random() * 0.04
    };

    return mockData;
  }

  /**
   * Execute the main backtest simulation
   */
  private static async executeBacktest(context: BacktestContext): Promise<BacktestResults> {
    const { config, signalData, benchmarkData, parsedRules, simulator } = context;
    
    const equityPoints: EquityPoint[] = [];
    const allTrades: TradeExecution[] = [];
    const warnings: string[] = [];

    // Align signal and benchmark data
    const alignedData = this.alignData(signalData, benchmarkData);
    
    if (alignedData.length === 0) {
      throw new Error('No aligned data points found for backtest period');
    }

    console.log(`📊 Processing ${alignedData.length} aligned data points`);

    // Process each day
    for (let i = 0; i < alignedData.length; i++) {
      const { signalDay, benchmarkDay, underlyingReturn } = alignedData[i];
      
      // Evaluate rules and calculate signal score
      const signalScore = this.evaluateRules(parsedRules, signalDay.agentData);
      
      // Apply position smoothing if configured
      let targetScore = signalScore;
      if (config.rebalanceDays && config.rebalanceDays > 1) {
        // Simple smoothing - in production could use more sophisticated methods
        targetScore = signalScore * 0.7 + (simulator.getCurrentState().position > 0 ? 0.5 : 0) * 0.3;
      }

      // Simulate day's trading and PnL
      const dayResult = simulator.processDay(
        signalDay.date,
        targetScore,
        benchmarkDay.price,
        benchmarkDay.return,
        underlyingReturn
      );

      // Record equity point
      equityPoints.push({
        ts: `${signalDay.date}T00:00:00Z`,
        nav: 1.0, // Base NAV
        strat: dayResult.nav,
        bench: dayResult.benchmark
      });

      // Collect trades
      allTrades.push(...dayResult.trades);

      if (i % 50 === 0) {
        console.log(`📈 Processed ${i + 1}/${alignedData.length} days, NAV: ${dayResult.nav.toFixed(4)}`);
      }
    }

    // Calculate performance metrics
    const benchmarkReturns = alignedData.map(d => d.benchmarkDay.return);
    const kpis = MetricsCalculator.calculateKpis(equityPoints, allTrades, benchmarkReturns);
    
    // Generate monthly PnL breakdown
    const monthlyPnL = MetricsCalculator.calculateMonthlyPnL(equityPoints);
    
    // Data quality validation
    const expectedDays = Math.ceil((new Date(config.window.to).getTime() - new Date(config.window.from).getTime()) / (24 * 60 * 60 * 1000));
    const dataWarnings = DataQualityUtils.validateDataQuality(equityPoints, expectedDays);
    warnings.push(...dataWarnings);

    // Add configuration warnings
    if (kpis.trades < 10) {
      warnings.push(`Low trade count: ${kpis.trades} (consider longer period or looser rules)`);
    }

    if (Math.abs(kpis.maxDDPct) > 0.5) {
      warnings.push(`High maximum drawdown: ${(kpis.maxDDPct * 100).toFixed(1)}% (consider risk management)`);
    }

    console.log(`📊 Final metrics - PnL: ${(kpis.pnlPct * 100).toFixed(2)}%, Sharpe: ${kpis.sharpe.toFixed(2)}, MaxDD: ${(kpis.maxDDPct * 100).toFixed(2)}%`);

    return {
      kpis,
      equity: equityPoints,
      monthlyPnL,
      notes: warnings
    };
  }

  /**
   * Align signal data with benchmark data by date
   */
  private static alignData(signalData: DailySignalData[], benchmarkData: BenchmarkData[]): Array<{
    signalDay: DailySignalData;
    benchmarkDay: BenchmarkData;
    underlyingReturn: number;
  }> {
    const aligned: Array<{
      signalDay: DailySignalData;
      benchmarkDay: BenchmarkData;
      underlyingReturn: number;
    }> = [];

    const benchmarkMap = new Map(benchmarkData.map(d => [d.date, d]));
    
    for (const signalDay of signalData) {
      const benchmarkDay = benchmarkMap.get(signalDay.date);
      if (benchmarkDay) {
        aligned.push({
          signalDay,
          benchmarkDay,
          underlyingReturn: benchmarkDay.return
        });
      }
    }

    return aligned;
  }

  /**
   * Evaluate all rules against agent data and calculate weighted score
   */
  private static evaluateRules(rules: ParsedRule[], agentData: Record<string, Record<string, any>>): number {
    let weightedScore = 0;
    let totalWeight = 0;

    for (const rule of rules) {
      // Flatten agent data for rule evaluation
      const flattenedData = this.flattenAgentData(agentData);
      
      // Evaluate rule
      const ruleResult = DSLParser.evalRule(rule, flattenedData);
      
      // Add to weighted score
      if (ruleResult) {
        weightedScore += rule.weight;
      }
      totalWeight += rule.weight;
    }

    // Return normalized score (0..1)
    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Flatten nested agent data for rule evaluation
   */
  private static flattenAgentData(agentData: Record<string, Record<string, any>>): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [agentCode, data] of Object.entries(agentData)) {
      this.flattenObject(data, '', flattened);
    }

    return flattened;
  }

  /**
   * Recursively flatten nested objects
   */
  private static flattenObject(obj: any, prefix: string, result: Record<string, any>): void {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenObject(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }
  }

  /**
   * Validate backtest results for reasonableness
   */
  private static validateResults(results: BacktestResults): void {
    const { kpis } = results;

    // Sanity checks
    if (Math.abs(kpis.pnlPct) > 10) {
      console.warn(`⚠️ Extremely high return: ${(kpis.pnlPct * 100).toFixed(1)}%`);
    }

    if (Math.abs(kpis.maxDDPct) > 0.9) {
      console.warn(`⚠️ Extremely high drawdown: ${(kpis.maxDDPct * 100).toFixed(1)}%`);
    }

    if (Math.abs(kpis.sharpe) > 10) {
      console.warn(`⚠️ Extremely high Sharpe ratio: ${kpis.sharpe.toFixed(2)}`);
    }

    if (kpis.trades === 0) {
      console.warn(`⚠️ No trades executed - check rules and signal data`);
    }
  }
}