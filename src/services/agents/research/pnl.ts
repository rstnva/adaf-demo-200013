// ================================================================================================
// PnL Simulation Engine
// ================================================================================================
// Handles position management, fees, slippage calculation, and PnL simulation for backtesting
// Provides realistic trading cost modeling and position tracking
// ================================================================================================

import { TradeExecution } from './metrics';

/**
 * Trading costs configuration
 */
export interface TradingCosts {
  feesBps: number;      // Round-trip fees in basis points
  slippageBps: number;  // Slippage per trade in basis points
  minFee?: number;      // Minimum fee in USD
  maxSlippage?: number; // Maximum slippage cap
}

/**
 * Position sizing configuration
 */
export interface PositionSizing {
  notionalPctNAV: number;  // Position size as % of NAV (0..1)
  maxLeverage?: number;    // Maximum leverage allowed
  minPosition?: number;    // Minimum position size
  maxPosition?: number;    // Maximum position size
}

/**
 * Daily position and PnL data
 */
export interface DailyPnL {
  date: string;
  targetPosition: number;    // Target position for the day
  actualPosition: number;    // Actual position after trades
  marketValue: number;       // Mark-to-market value
  realizedPnl: number;      // Realized PnL from trades
  unrealizedPnl: number;    // Unrealized PnL from positions
  totalPnl: number;         // Total PnL for the day
  fees: number;             // Trading fees paid
  slippage: number;         // Slippage costs
  nav: number;              // Net Asset Value
  benchmark: number;        // Benchmark value
  trades: TradeExecution[]; // Trades executed
}

/**
 * PnL simulation engine for backtesting
 */
export class PnLSimulator {
  private position: number = 0;
  private nav: number = 1.0;
  private benchmarkNav: number = 1.0;
  private entryPrice: number = 0;
  private totalRealizedPnl: number = 0;
  private totalFees: number = 0;
  private totalSlippage: number = 0;
  private dailyResults: DailyPnL[] = [];

  constructor(
    private initialNAV: number = 1.0,
    private costs: TradingCosts,
    private sizing: PositionSizing
  ) {
    this.nav = initialNAV;
    this.benchmarkNav = initialNAV;
  }

  /**
   * Process a single day's signals and update positions/PnL
   */
  processDay(
    date: string,
    signalScore: number,      // Aggregated signal score (0..1)
    underlyingPrice: number,  // Current price of underlying asset
    benchmarkReturn: number,  // Benchmark daily return
    underlyingReturn: number  // Underlying asset daily return
  ): DailyPnL {
    // Calculate target position based on signal score
    const targetPosition = this.calculateTargetPosition(signalScore);
    
    // Execute trades if position needs to change
    const trades = this.executePositionChange(date, targetPosition, underlyingPrice);
    
    // Update unrealized PnL from existing positions
    const unrealizedPnl = this.calculateUnrealizedPnL(underlyingPrice, underlyingReturn);
    
    // Calculate total PnL for the day
    const realizedPnl = trades.reduce((sum, trade) => sum + trade.realizedPnl, 0);
    const totalPnl = realizedPnl + unrealizedPnl;
    
    // Update NAV
    const previousNav = this.nav;
    this.nav = this.nav * (1 + totalPnl / this.nav);
    
    // Update benchmark NAV
    this.benchmarkNav = this.benchmarkNav * (1 + benchmarkReturn);
    
    // Calculate costs for the day
    const dayFees = trades.reduce((sum, trade) => sum + trade.fees, 0);
    const daySlippage = trades.reduce((sum, trade) => sum + trade.slippage, 0);
    
    this.totalFees += dayFees;
    this.totalSlippage += daySlippage;
    
    const dailyResult: DailyPnL = {
      date,
      targetPosition,
      actualPosition: this.position,
      marketValue: this.position * underlyingPrice,
      realizedPnl,
      unrealizedPnl,
      totalPnl,
      fees: dayFees,
      slippage: daySlippage,
      nav: this.nav,
      benchmark: this.benchmarkNav,
      trades
    };
    
    this.dailyResults.push(dailyResult);
    return dailyResult;
  }

  /**
   * Calculate target position based on signal score and sizing rules
   */
  private calculateTargetPosition(signalScore: number): number {
    // Clamp signal score to [0, 1]
    const clampedScore = Math.max(0, Math.min(1, signalScore));
    
    // Convert to position size
    let targetPosition = clampedScore * this.sizing.notionalPctNAV * this.nav;
    
    // Apply position limits
    if (this.sizing.minPosition !== undefined) {
      targetPosition = Math.max(targetPosition, this.sizing.minPosition);
    }
    
    if (this.sizing.maxPosition !== undefined) {
      targetPosition = Math.min(targetPosition, this.sizing.maxPosition);
    }
    
    // Apply leverage limits
    if (this.sizing.maxLeverage !== undefined) {
      const maxPositionByLeverage = this.nav * this.sizing.maxLeverage;
      targetPosition = Math.min(targetPosition, maxPositionByLeverage);
    }
    
    return targetPosition;
  }

  /**
   * Execute position changes and calculate trading costs
   */
  private executePositionChange(date: string, targetPosition: number, price: number): TradeExecution[] {
    const trades: TradeExecution[] = [];
    const positionChange = targetPosition - this.position;
    
    // Only trade if change is significant (> 1e-6)
    if (Math.abs(positionChange) <= 1e-6) {
      return trades;
    }

    const notionalValue = Math.abs(positionChange) * price;
    
    // Calculate fees
    let fees = notionalValue * (this.costs.feesBps / 10000);
    if (this.costs.minFee !== undefined) {
      fees = Math.max(fees, this.costs.minFee);
    }
    
    // Calculate slippage
    let slippage = notionalValue * (this.costs.slippageBps / 10000);
    if (this.costs.maxSlippage !== undefined) {
      slippage = Math.min(slippage, this.costs.maxSlippage);
    }
    
    // Calculate realized PnL for position reduction
    let realizedPnl = 0;
    if (this.position !== 0 && this.entryPrice > 0) {
      const closingQuantity = Math.min(Math.abs(positionChange), Math.abs(this.position));
      realizedPnl = closingQuantity * (price - this.entryPrice);
      
      // Adjust for position direction
      if (this.position < 0) {
        realizedPnl = -realizedPnl;
      }
    }
    
    const trade: TradeExecution = {
      timestamp: `${date}T00:00:00Z`,
      side: positionChange > 0 ? 'BUY' : 'SELL',
      quantity: Math.abs(positionChange),
      price,
      fees,
      slippage,
      realizedPnl: realizedPnl - fees - slippage,
      positionSize: targetPosition
    };
    
    // Update position and entry price
    const oldPosition = this.position;
    this.position = targetPosition;
    
    // Update entry price for new positions or additions
    if (targetPosition !== 0) {
      if (Math.sign(targetPosition) !== Math.sign(oldPosition) || oldPosition === 0) {
        // New position or direction change
        this.entryPrice = price;
      } else if (Math.abs(targetPosition) > Math.abs(oldPosition)) {
        // Adding to position - weighted average entry price
        const addedQuantity = Math.abs(targetPosition) - Math.abs(oldPosition);
        const totalQuantity = Math.abs(targetPosition);
        this.entryPrice = (this.entryPrice * Math.abs(oldPosition) + price * addedQuantity) / totalQuantity;
      }
    }
    
    this.totalRealizedPnl += trade.realizedPnl;
    trades.push(trade);
    
    return trades;
  }

  /**
   * Calculate unrealized PnL from current positions
   */
  private calculateUnrealizedPnL(currentPrice: number, underlyingReturn: number): number {
    if (this.position === 0 || this.entryPrice === 0) {
      return 0;
    }
    
    // Calculate unrealized PnL based on price change
    const pnlPerUnit = currentPrice - this.entryPrice;
    const unrealizedPnl = this.position * pnlPerUnit;
    
    // For short positions, PnL is inverted
    return unrealizedPnl;
  }

  /**
   * Apply position smoothing using EMA (optional enhancement)
   */
  smoothPosition(targetPosition: number, smoothingFactor: number = 0.5): number {
    if (this.position === 0) {
      return targetPosition;
    }
    
    // EMA smoothing: new_position = α * target + (1-α) * current
    return smoothingFactor * targetPosition + (1 - smoothingFactor) * this.position;
  }

  /**
   * Get simulation results summary
   */
  getResults(): {
    dailyResults: DailyPnL[];
    totalRealizedPnl: number;
    totalFees: number;
    totalSlippage: number;
    finalNav: number;
    finalBenchmark: number;
    finalPosition: number;
  } {
    return {
      dailyResults: [...this.dailyResults],
      totalRealizedPnl: this.totalRealizedPnl,
      totalFees: this.totalFees,
      totalSlippage: this.totalSlippage,
      finalNav: this.nav,
      finalBenchmark: this.benchmarkNav,
      finalPosition: this.position
    };
  }

  /**
   * Reset simulator for new backtest
   */
  reset(initialNAV: number = 1.0): void {
    this.position = 0;
    this.nav = initialNAV;
    this.benchmarkNav = initialNAV;
    this.entryPrice = 0;
    this.totalRealizedPnl = 0;
    this.totalFees = 0;
    this.totalSlippage = 0;
    this.dailyResults = [];
  }

  /**
   * Get current portfolio state
   */
  getCurrentState(): {
    position: number;
    nav: number;
    benchmarkNav: number;
    totalPnl: number;
    totalCosts: number;
  } {
    return {
      position: this.position,
      nav: this.nav,
      benchmarkNav: this.benchmarkNav,
      totalPnl: this.totalRealizedPnl,
      totalCosts: this.totalFees + this.totalSlippage
    };
  }

  /**
   * Validate costs configuration
   */
  static validateCosts(costs: TradingCosts): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (costs.feesBps < 0 || costs.feesBps > 1000) {
      errors.push('Fees must be between 0 and 1000 basis points');
    }

    if (costs.slippageBps < 0 || costs.slippageBps > 1000) {
      errors.push('Slippage must be between 0 and 1000 basis points');
    }

    if (costs.minFee !== undefined && costs.minFee < 0) {
      errors.push('Minimum fee cannot be negative');
    }

    if (costs.maxSlippage !== undefined && costs.maxSlippage < 0) {
      errors.push('Maximum slippage cannot be negative');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate sizing configuration
   */
  static validateSizing(sizing: PositionSizing): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (sizing.notionalPctNAV <= 0 || sizing.notionalPctNAV > 1) {
      errors.push('Notional % of NAV must be between 0 and 1');
    }

    if (sizing.maxLeverage !== undefined && sizing.maxLeverage <= 0) {
      errors.push('Maximum leverage must be positive');
    }

    if (sizing.minPosition !== undefined && sizing.minPosition < 0) {
      errors.push('Minimum position cannot be negative');
    }

    if (sizing.maxPosition !== undefined && sizing.maxPosition < 0) {
      errors.push('Maximum position cannot be negative');
    }

    if (sizing.minPosition !== undefined && sizing.maxPosition !== undefined && 
        sizing.minPosition > sizing.maxPosition) {
      errors.push('Minimum position cannot be greater than maximum position');
    }

    return { valid: errors.length === 0, errors };
  }
}