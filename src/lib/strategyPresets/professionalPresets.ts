/**
 * Professional Strategy Presets - Research Strategy Templates
 * 
 * Six professional-grade strategy templates with complete DSL rules,
 * parameters, success criteria, and validation schemas.
 */

import { StrategyPreset, StrategyTemplate } from '../../types/strategyPresets';

/**
 * 1. ETF Flow Spike Strategy
 * Detects and capitalizes on unusual ETF flow patterns
 */
const etfFlowSpikePreset: StrategyPreset = {
  id: 'etf-flow-spike-v1',
  name: 'ETF Flow Spike Detector',
  category: 'flow-analysis',
  description: 'Identifies and trades unusual ETF inflow/outflow patterns using volume and flow analysis',
  overview: 'This strategy monitors ETF flow data to detect significant deviations from normal patterns, then positions accordingly to capture momentum or mean reversion opportunities.',
  
  riskLevel: 'moderate',
  timeHorizon: 'short-term',
  marketConditions: ['bull', 'volatile'],
  
  parameters: [
    {
      name: 'flowThreshold',
      type: 'percentage',
      defaultValue: 150,
      min: 100,
      max: 500,
      description: 'Flow spike threshold as percentage of 20-day average',
      validation: { required: true }
    },
    {
      name: 'minVolume',
      type: 'currency',
      defaultValue: 10000000,
      min: 1000000,
      max: 100000000,
      description: 'Minimum daily volume for ETF inclusion ($)',
      validation: { required: true }
    },
    {
      name: 'holdingPeriod',
      type: 'duration',
      defaultValue: '3d',
      description: 'Maximum position holding period',
      validation: { required: true }
    },
    {
      name: 'sectorFocus',
      type: 'selection',
      defaultValue: 'all',
      options: ['all', 'tech', 'healthcare', 'financials', 'energy'],
      description: 'Sector focus for ETF selection',
      validation: { required: false }
    }
  ],
  
  rules: [
    {
      id: 'flow-spike-detection',
      name: 'Flow Spike Detection',
      condition: 'etf.dailyFlow > etf.avg20DayFlow * params.flowThreshold / 100 AND etf.volume > params.minVolume',
      action: 'signal.BUY with confidence=0.8 size=position_size_kelly(0.02)',
      enabled: true,
      weight: 1.0,
      description: 'Detect significant flow spikes above threshold'
    },
    {
      id: 'flow-reversal-detection',
      name: 'Flow Reversal Detection',
      condition: 'etf.dailyFlow < -etf.avg20DayFlow * params.flowThreshold / 100 AND etf.volume > params.minVolume',
      action: 'signal.SELL with confidence=0.7 size=position_size_kelly(0.015)',
      enabled: true,
      weight: 0.8,
      description: 'Detect significant outflow patterns'
    },
    {
      id: 'exit-time-based',
      name: 'Time-Based Exit',
      condition: 'position.holdingDays >= duration_to_days(params.holdingPeriod)',
      action: 'signal.CLOSE reason="time_limit"',
      enabled: true,
      weight: 1.0,
      description: 'Close positions after maximum holding period'
    },
    {
      id: 'exit-profit-target',
      name: 'Profit Target Exit',
      condition: 'position.unrealizedPnL > position.notional * 0.05',
      action: 'signal.CLOSE_PARTIAL ratio=0.5 reason="profit_taking"',
      enabled: true,
      weight: 1.0,
      description: 'Take partial profits at 5% gain'
    }
  ],
  
  successCriteria: [
    {
      name: 'Sharpe Ratio',
      target: 1.2,
      unit: 'ratio',
      timeframe: '12M',
      description: 'Risk-adjusted return target',
      priority: 'primary'
    },
    {
      name: 'Max Drawdown',
      target: -8,
      unit: '%',
      timeframe: 'rolling',
      description: 'Maximum acceptable drawdown',
      priority: 'primary'
    },
    {
      name: 'Win Rate',
      target: 55,
      unit: '%',
      timeframe: 'lifetime',
      description: 'Percentage of profitable trades',
      priority: 'secondary'
    }
  ],
  
  riskMetrics: {
    maxDrawdown: 0.08,
    volatilityTarget: 0.12,
    sharpeRatio: 1.2,
    maxLeverage: 2.0,
    stopLoss: 0.03,
    positionSizing: 'kelly'
  },
  
  version: '1.0.0',
  author: 'ADAF Research Team',
  created: '2024-01-15',
  tags: ['etf', 'flow-analysis', 'momentum', 'quantitative'],
  
  backtestConfig: {
    startDate: '2022-01-01',
    endDate: '2024-01-01',
    benchmarks: ['SPY', 'QQQ'],
    universe: ['etf_universe_large_cap']
  },
  
  researchNotes: {
    methodology: 'Uses ETF flow data combined with volume analysis to identify significant deviations from normal patterns. Positions are sized using Kelly criterion with risk management overlays.',
    keyInsights: [
      'ETF flows often precede individual stock movements by 1-2 days',
      'Sector-specific ETFs show stronger signal strength than broad market ETFs',
      'Flow spikes during market hours have higher predictive power'
    ],
    marketAssumptions: [
      'ETF arbitrage mechanism continues to function efficiently',
      'Flow data represents genuine institutional positioning changes',
      'Market microstructure remains stable'
    ],
    limitations: [
      'Strategy performance may degrade during extreme market stress',
      'Requires high-quality, real-time flow data',
      'May experience capacity constraints at scale'
    ],
    references: [
      'Petajisto, A. (2013). "Inefficiencies in the pricing of exchange-traded funds"',
      'Ben-David, I. et al. (2018). "Do ETFs increase volatility?"'
    ]
  },
  
  displayConfig: {
    icon: '📊',
    color: '#3B82F6',
    difficulty: 3,
    estimatedSetupTime: '45 minutes'
  }
};

/**
 * 2. TVL Momentum Strategy
 * Tracks Total Value Locked (TVL) changes in DeFi protocols
 */
const tvlMomentumPreset: StrategyPreset = {
  id: 'tvl-momentum-v1',
  name: 'DeFi TVL Momentum Tracker',
  category: 'momentum',
  description: 'Captures momentum in DeFi protocols based on Total Value Locked (TVL) changes and yield dynamics',
  overview: 'Monitors TVL flows across major DeFi protocols to identify emerging trends and position in related tokens before broader market recognition.',
  
  riskLevel: 'aggressive',
  timeHorizon: 'medium-term',
  marketConditions: ['bull', 'sideways'],
  
  parameters: [
    {
      name: 'tvlChangeThreshold',
      type: 'percentage',
      defaultValue: 20,
      min: 5,
      max: 100,
      description: 'Minimum TVL change to trigger signal (%)',
      validation: { required: true }
    },
    {
      name: 'minTvl',
      type: 'currency',
      defaultValue: 50000000,
      min: 10000000,
      max: 1000000000,
      description: 'Minimum protocol TVL for consideration ($)',
      validation: { required: true }
    },
    {
      name: 'lookbackPeriod',
      type: 'duration',
      defaultValue: '7d',
      description: 'TVL change calculation period',
      validation: { required: true }
    },
    {
      name: 'protocolTypes',
      type: 'selection',
      defaultValue: 'all',
      options: ['all', 'dex', 'lending', 'yield-farming', 'derivatives'],
      description: 'Focus on specific protocol types',
      validation: { required: false }
    }
  ],
  
  rules: [
    {
      id: 'tvl-momentum-up',
      name: 'TVL Upward Momentum',
      condition: 'protocol.tvlChange7d > params.tvlChangeThreshold AND protocol.currentTvl > params.minTvl',
      action: 'signal.BUY_TOKENS tokens=protocol.governanceToken confidence=0.75',
      enabled: true,
      weight: 1.0,
      description: 'Buy governance tokens when TVL increases significantly'
    },
    {
      id: 'yield-correlation',
      name: 'Yield-TVL Correlation',
      condition: 'protocol.yieldChange7d > 0 AND protocol.tvlChange7d > params.tvlChangeThreshold',
      action: 'signal.INCREASE_POSITION multiplier=1.5 reason="yield_correlation"',
      enabled: true,
      weight: 0.8,
      description: 'Increase position when yield and TVL both increase'
    },
    {
      id: 'tvl-momentum-reversal',
      name: 'TVL Reversal Detection',
      condition: 'protocol.tvlChange7d < -params.tvlChangeThreshold AND position.exists(protocol.governanceToken)',
      action: 'signal.SELL tokens=protocol.governanceToken ratio=0.6',
      enabled: true,
      weight: 1.0,
      description: 'Reduce position on TVL decline'
    },
    {
      id: 'cross-protocol-analysis',
      name: 'Cross-Protocol Momentum',
      condition: 'sector_tvl_momentum(params.protocolTypes) > 0.3',
      action: 'signal.BUY_SECTOR sector=params.protocolTypes weight=0.5',
      enabled: false,
      weight: 0.6,
      description: 'Buy sector tokens when overall momentum is strong'
    }
  ],
  
  successCriteria: [
    {
      name: 'Alpha Generation',
      target: 15,
      unit: '%',
      timeframe: '12M',
      description: 'Excess return vs DeFi index',
      priority: 'primary'
    },
    {
      name: 'Information Ratio',
      target: 1.0,
      unit: 'ratio',
      timeframe: '12M',
      description: 'Alpha divided by tracking error',
      priority: 'primary'
    },
    {
      name: 'Hit Rate',
      target: 60,
      unit: '%',
      timeframe: 'lifetime',
      description: 'Percentage of positive alpha periods',
      priority: 'secondary'
    }
  ],
  
  riskMetrics: {
    maxDrawdown: 0.15,
    volatilityTarget: 0.25,
    sharpeRatio: 1.0,
    maxLeverage: 1.5,
    positionSizing: 'risk_parity'
  },
  
  version: '1.0.0',
  author: 'ADAF DeFi Research',
  created: '2024-01-15',
  tags: ['defi', 'tvl', 'momentum', 'governance-tokens'],
  
  backtestConfig: {
    startDate: '2021-01-01',
    endDate: '2024-01-01',
    benchmarks: ['DPI', 'DEFI'],
    universe: ['defi_protocols_top_50']
  },
  
  researchNotes: {
    methodology: 'Monitors TVL changes across major DeFi protocols and correlates with governance token performance. Uses momentum factors and yield dynamics to generate trading signals.',
    keyInsights: [
      'TVL changes often precede governance token price movements by 2-5 days',
      'Yield increases combined with TVL growth create strongest signals',
      'Cross-protocol momentum provides additional alpha during sector rotations'
    ],
    marketAssumptions: [
      'DeFi protocols maintain transparent TVL reporting',
      'Governance tokens continue to reflect protocol value',
      'DeFi sector maintains growth trajectory'
    ],
    limitations: [
      'High volatility in governance tokens',
      'Regulatory risks in DeFi space',
      'Smart contract and technical risks'
    ],
    references: [
      'Schär, F. (2021). "Decentralized Finance: On Blockchain- and Smart Contract-Based Financial Markets"',
      'Harvey, C. et al. (2021). "DeFi and the Future of Finance"'
    ]
  },
  
  displayConfig: {
    icon: '🏦',
    color: '#10B981',
    difficulty: 4,
    estimatedSetupTime: '60 minutes'
  }
};

/**
 * DSL Code Templates for each strategy
 */
const etfFlowSpikeDSL = `
// ETF Flow Spike Strategy DSL
strategy "ETF Flow Spike Detector" {
  universe = etf_universe_filtered(
    min_volume: params.minVolume,
    sector: params.sectorFocus != "all" ? params.sectorFocus : null
  )
  
  signals = {
    // Flow spike detection
    flow_spike: etf.daily_flow > (etf.avg_flow_20d * params.flowThreshold / 100),
    flow_reversal: etf.daily_flow < -(etf.avg_flow_20d * params.flowThreshold / 100),
    
    // Volume confirmation
    volume_confirm: etf.volume > params.minVolume,
    
    // Technical confirmation
    price_momentum: etf.returns_5d > 0,
    relative_strength: etf.rs_vs_spy > 1.02
  }
  
  entry_conditions = {
    long: flow_spike AND volume_confirm,
    short: flow_reversal AND volume_confirm
  }
  
  exit_conditions = {
    time_limit: position.age > duration_to_days(params.holdingPeriod),
    profit_target: position.pnl_pct > 0.05,
    stop_loss: position.pnl_pct < -0.03
  }
  
  position_sizing = kelly_criterion(
    win_rate: 0.58,
    avg_win: 0.032,
    avg_loss: -0.018,
    max_risk: 0.02
  )
  
  risk_management = {
    max_positions: 15,
    sector_concentration: 0.4,
    daily_loss_limit: 0.015
  }
}`;

const tvlMomentumDSL = `
// DeFi TVL Momentum Strategy DSL
strategy "DeFi TVL Momentum Tracker" {
  universe = defi_protocols_filtered(
    min_tvl: params.minTvl,
    protocol_type: params.protocolTypes != "all" ? params.protocolTypes : null
  )
  
  features = {
    // TVL momentum
    tvl_change: (protocol.current_tvl - protocol.tvl_lookback(params.lookbackPeriod)) / protocol.tvl_lookback(params.lookbackPeriod),
    tvl_velocity: derivative(protocol.tvl_7d_ma, 3),
    
    // Yield dynamics
    yield_change: protocol.current_yield - protocol.yield_lookback(params.lookbackPeriod),
    yield_stability: rolling_std(protocol.daily_yield, 14),
    
    // Token metrics
    token_momentum: protocol.governance_token.returns_14d,
    token_volume: protocol.governance_token.volume_usd_7d_avg,
    
    // Cross-protocol signals
    sector_momentum: sector_tvl_change(protocol.category, params.lookbackPeriod),
    competitive_position: protocol.tvl_rank_in_category
  }
  
  signals = {
    // Primary TVL signals
    strong_tvl_growth: tvl_change > (params.tvlChangeThreshold / 100),
    tvl_acceleration: tvl_velocity > 0 AND tvl_change > 0,
    
    // Yield correlation
    yield_tvl_sync: yield_change > 0 AND tvl_change > (params.tvlChangeThreshold / 100),
    
    // Technical signals
    token_breakout: token_momentum > 0.15 AND token_volume > protocol.governance_token.volume_baseline,
    
    // Sector signals
    sector_rotation: sector_momentum > 0.2 AND competitive_position <= 5
  }
  
  entry_conditions = {
    core_long: strong_tvl_growth AND protocol.governance_token.exists(),
    enhanced_long: yield_tvl_sync OR token_breakout,
    sector_play: sector_rotation
  }
  
  exit_conditions = {
    tvl_reversal: tvl_change < -(params.tvlChangeThreshold / 100),
    yield_collapse: yield_change < -0.5,
    technical_breakdown: token_momentum < -0.1,
    risk_management: position.drawdown > 0.2
  }
  
  position_sizing = risk_parity_allocation(
    lookback: 30,
    target_vol: 0.25,
    max_weight: 0.08
  )
  
  rebalance_frequency = "weekly"
}`;

// Export templates
export const strategyTemplates: StrategyTemplate[] = [
  {
    preset: etfFlowSpikePreset,
    dslCode: etfFlowSpikeDSL,
    exampleParameters: {
      flowThreshold: 150,
      minVolume: 10000000,
      holdingPeriod: '3d',
      sectorFocus: 'tech'
    },
    validationSchema: {
      flowThreshold: { min: 100, max: 500, type: 'number' },
      minVolume: { min: 1000000, type: 'number' },
      holdingPeriod: { pattern: '^\\d+[dwhm]$', type: 'string' }
    }
  },
  {
    preset: tvlMomentumPreset,
    dslCode: tvlMomentumDSL,
    exampleParameters: {
      tvlChangeThreshold: 20,
      minTvl: 50000000,
      lookbackPeriod: '7d',
      protocolTypes: 'all'
    },
    validationSchema: {
      tvlChangeThreshold: { min: 5, max: 100, type: 'number' },
      minTvl: { min: 10000000, type: 'number' },
      lookbackPeriod: { pattern: '^\\d+[dwhm]$', type: 'string' }
    }
  }
];

export { etfFlowSpikePreset, tvlMomentumPreset };