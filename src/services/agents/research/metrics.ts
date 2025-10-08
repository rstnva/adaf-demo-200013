// ================================================================================================
// Metrics & KPI Calculation Helpers
// ================================================================================================
// Comprehensive performance metrics calculations for backtesting results
// Includes PnL, Sharpe ratio, drawdown, hit rate, and volatility calculations
// ================================================================================================

import { BacktestKpis, EquityPoint, MonthlyPnL } from '@/types/research';

/**
 * Performance metrics calculator for backtesting results
 */
export class MetricsCalculator {
  /**
   * Calculate comprehensive KPIs from equity curve and trades data
   */
  static calculateKpis(
    equityPoints: EquityPoint[],
    trades: TradeExecution[],
    benchmarkReturns: number[]
  ): BacktestKpis {
    if (equityPoints.length < 2) {
      throw new Error('Need at least 2 equity points to calculate KPIs');
    }

    const strategyReturns = this.calculateReturns(equityPoints.map(p => p.strat));
    const benchReturns = benchmarkReturns.length > 0 ? benchmarkReturns : 
                        this.calculateReturns(equityPoints.map(p => p.bench));

    const totalReturn = this.calculateTotalReturn(strategyReturns);
    const annualizedReturn = this.calculateAnnualizedReturn(strategyReturns);
    const volatility = this.calculateVolatility(strategyReturns);
    const maxDrawdown = this.calculateMaxDrawdown(equityPoints.map(p => p.strat));
    const sharpeRatio = this.calculateSharpe(annualizedReturn, volatility);
    const hitRate = this.calculateHitRate(trades);
    const excessReturn = this.calculateExcessReturn(strategyReturns, benchReturns);

    const totalPnlUsd = trades.reduce((sum, trade) => sum + trade.realizedPnl, 0);

    return {
      pnlUsd: totalPnlUsd,
      pnlPct: totalReturn,
      maxDDPct: maxDrawdown,
      sharpe: sharpeRatio,
      hitRate: hitRate,
      trades: trades.length,
      volPct: volatility,
      vsBenchmarkPct: excessReturn
    };
  }

  /**
   * Calculate daily returns from price series
   */
  static calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      } else {
        returns.push(0);
      }
    }
    
    return returns;
  }

  /**
   * Calculate total return from returns series
   */
  static calculateTotalReturn(returns: number[]): number {
    return returns.reduce((cumulative, dailyReturn) => {
      return cumulative * (1 + dailyReturn);
    }, 1) - 1;
  }

  /**
   * Calculate annualized return (252 trading days)
   */
  static calculateAnnualizedReturn(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const totalReturn = this.calculateTotalReturn(returns);
    const years = returns.length / 252;
    
    if (years <= 0) return totalReturn;
    
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }

  /**
   * Calculate annualized volatility (252 trading days)
   */
  static calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance * 252); // Annualized
  }

  /**
   * Calculate maximum drawdown from equity curve
   */
  static calculateMaxDrawdown(equityCurve: number[]): number {
    let maxDrawdown = 0;
    let peak = equityCurve[0] || 1;

    for (const value of equityCurve) {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = (value - peak) / peak;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Sharpe ratio (risk-free rate assumed to be 0)
   */
  static calculateSharpe(annualizedReturn: number, annualizedVolatility: number): number {
    if (annualizedVolatility === 0) return 0;
    return annualizedReturn / annualizedVolatility;
  }

  /**
   * Calculate hit rate (percentage of winning trades)
   */
  static calculateHitRate(trades: TradeExecution[]): number {
    if (trades.length === 0) return 0;

    const winningTrades = trades.filter(trade => trade.realizedPnl > 0).length;
    return winningTrades / trades.length;
  }

  /**
   * Calculate excess return vs benchmark
   */
  static calculateExcessReturn(strategyReturns: number[], benchmarkReturns: number[]): number {
    if (strategyReturns.length !== benchmarkReturns.length) {
      // If lengths don't match, calculate total returns separately
      const stratTotalReturn = this.calculateTotalReturn(strategyReturns);
      const benchTotalReturn = this.calculateTotalReturn(benchmarkReturns);
      return stratTotalReturn - benchTotalReturn;
    }

    // Calculate cumulative excess returns
    let stratCumulative = 1;
    let benchCumulative = 1;

    for (let i = 0; i < strategyReturns.length; i++) {
      stratCumulative *= (1 + strategyReturns[i]);
      benchCumulative *= (1 + (benchmarkReturns[i] || 0));
    }

    return (stratCumulative - 1) - (benchCumulative - 1);
  }

  /**
   * Generate monthly PnL breakdown from equity curve
   */
  static calculateMonthlyPnL(equityPoints: EquityPoint[]): MonthlyPnL[] {
    if (equityPoints.length < 2) return [];

    const monthlyData: Map<string, { start: number; end: number }> = new Map();

    for (const point of equityPoints) {
      const date = new Date(point.ts);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(yearMonth)) {
        monthlyData.set(yearMonth, { start: point.strat, end: point.strat });
      } else {
        const existing = monthlyData.get(yearMonth)!;
        existing.end = point.strat;
      }
    }

    return Array.from(monthlyData.entries())
      .map(([ym, data]) => ({
        ym,
        pnlPct: data.start > 0 ? (data.end - data.start) / data.start : 0
      }))
      .sort((a, b) => a.ym.localeCompare(b.ym));
  }

  /**
   * Clamp extreme values to prevent unrealistic results
   */
  static clampValue(value: number, min: number = -10, max: number = 10): number {
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate rolling Sharpe ratio for time series analysis
   */
  static calculateRollingSharpe(returns: number[], window: number = 63): number[] { // ~3 months
    const rollingSharpe: number[] = [];

    for (let i = window - 1; i < returns.length; i++) {
      const windowReturns = returns.slice(i - window + 1, i + 1);
      const annualizedReturn = this.calculateAnnualizedReturn(windowReturns);
      const volatility = this.calculateVolatility(windowReturns);
      const sharpe = this.calculateSharpe(annualizedReturn, volatility);
      
      rollingSharpe.push(this.clampValue(sharpe, -5, 5));
    }

    return rollingSharpe;
  }

  /**
   * Calculate Value at Risk (VaR) at given confidence level
   */
  static calculateVaR(returns: number[], confidenceLevel: number = 0.05): number {
    if (returns.length === 0) return 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidenceLevel);
    
    return sortedReturns[index] || 0;
  }

  /**
   * Calculate Calmar ratio (annualized return / max drawdown)
   */
  static calculateCalmar(annualizedReturn: number, maxDrawdown: number): number {
    if (maxDrawdown >= 0) return 0;
    return annualizedReturn / Math.abs(maxDrawdown);
  }
}

/**
 * Trade execution data for performance calculations
 */
export interface TradeExecution {
  timestamp: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fees: number;
  slippage: number;
  realizedPnl: number;
  positionSize: number;
}

/**
 * Position management helper for backtesting
 */
export class PositionManager {
  private currentPosition: number = 0;
  private entryPrice: number = 0;
  private trades: TradeExecution[] = [];

  /**
   * Update position based on target allocation
   */
  updatePosition(
    timestamp: string,
    targetPosition: number,
    currentPrice: number,
    feesBps: number,
    slippageBps: number
  ): TradeExecution | null {
    const positionChange = targetPosition - this.currentPosition;
    
    // Only trade if position change is significant (> 1e-6)
    if (Math.abs(positionChange) <= 1e-6) {
      return null;
    }

    const notionalValue = Math.abs(positionChange) * currentPrice;
    const fees = notionalValue * (feesBps / 10000);
    const slippage = notionalValue * (slippageBps / 10000);
    
    // Calculate realized PnL for position reduction
    let realizedPnl = 0;
    if (this.currentPosition !== 0 && this.entryPrice > 0) {
      const closingQuantity = Math.min(Math.abs(positionChange), Math.abs(this.currentPosition));
      realizedPnl = closingQuantity * (currentPrice - this.entryPrice);
      
      // Adjust for position direction
      if (this.currentPosition < 0) {
        realizedPnl = -realizedPnl;
      }
    }

    const trade: TradeExecution = {
      timestamp,
      side: positionChange > 0 ? 'BUY' : 'SELL',
      quantity: Math.abs(positionChange),
      price: currentPrice,
      fees,
      slippage,
      realizedPnl: realizedPnl - fees - slippage,
      positionSize: targetPosition
    };

    // Update position tracking
    this.currentPosition = targetPosition;
    if (targetPosition !== 0) {
      // Update entry price for new position
      if (Math.sign(targetPosition) !== Math.sign(this.currentPosition - positionChange)) {
        this.entryPrice = currentPrice;
      }
    }

    this.trades.push(trade);
    return trade;
  }

  getCurrentPosition(): number {
    return this.currentPosition;
  }

  getTrades(): TradeExecution[] {
    return [...this.trades];
  }

  reset(): void {
    this.currentPosition = 0;
    this.entryPrice = 0;
    this.trades = [];
  }
}

/**
 * Utility functions for data quality and validation
 */
export class DataQualityUtils {
  /**
   * Calculate data coverage percentage
   */
  static calculateCoverage(expectedDays: number, actualDataPoints: number): number {
    return Math.min(actualDataPoints / expectedDays, 1);
  }

  /**
   * Validate data quality and generate warnings
   */
  static validateDataQuality(
    equityPoints: EquityPoint[],
    expectedDays: number,
    minCoverage: number = 0.9
  ): string[] {
    const warnings: string[] = [];

    // Check data coverage
    const coverage = this.calculateCoverage(expectedDays, equityPoints.length);
    if (coverage < minCoverage) {
      warnings.push(`Low data coverage: ${(coverage * 100).toFixed(1)}% (expected >${(minCoverage * 100).toFixed(0)}%)`);
    }

    // Check for short backtests
    if (expectedDays < 30) {
      warnings.push(`Short backtest period: ${expectedDays} days (minimum 30 days recommended)`);
    }

    // Check for data gaps
    const timestamps = equityPoints.map(p => new Date(p.ts).getTime());
    const avgGap = timestamps.length > 1 ? 
      (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1) : 0;
    const expectedGap = 24 * 60 * 60 * 1000; // 1 day in ms

    if (avgGap > expectedGap * 1.5) {
      warnings.push(`Large data gaps detected (avg: ${(avgGap / (24 * 60 * 60 * 1000)).toFixed(1)} days)`);
    }

    return warnings;
  }
}