/**
 * Professional Strategy Presets - Additional Templates (3-6)
 * 
 * Negative Funding, Real-Yield Composite, Whale Watch, and Reg-Catalyst Calendar strategies
 */

import { StrategyPreset, StrategyTemplate } from '../../types/strategyPresets';

/**
 * 3. Negative Funding Rate Strategy
 * Exploits negative funding rates in perpetual futures
 */
const negativeFundingPreset: StrategyPreset = {
  id: 'negative-funding-v1',
  name: 'Negative Funding Arbitrage',
  category: 'funding-arbitrage',
  description: 'Captures arbitrage opportunities from negative funding rates in perpetual futures markets',
  overview: 'Systematically identifies and exploits negative funding rate environments by taking long positions in perpetual contracts while hedging with spot positions.',
  
  riskLevel: 'conservative',
  timeHorizon: 'short-term',
  marketConditions: ['bear', 'sideways', 'volatile'],
  
  parameters: [
    {
      name: 'fundingThreshold',
      type: 'percentage',
      defaultValue: -0.01,
      min: -0.05,
      max: 0,
      description: 'Minimum negative funding rate to trigger strategy (%)',
      validation: { required: true }
    },
    {
      name: 'minLiquidity',
      type: 'currency',
      defaultValue: 1000000,
      min: 100000,
      max: 10000000,
      description: 'Minimum market liquidity requirement ($)',
      validation: { required: true }
    },
    {
      name: 'hedgeRatio',
      type: 'percentage',
      defaultValue: 95,
      min: 80,
      max: 100,
      description: 'Percentage of perp position to hedge with spot',
      validation: { required: true }
    },
    {
      name: 'exchanges',
      type: 'selection',
      defaultValue: 'all',
      options: ['all', 'binance', 'ftx', 'bybit', 'deribit'],
      description: 'Target exchanges for arbitrage',
      validation: { required: false }
    }
  ],
  
  rules: [
    {
      id: 'negative-funding-entry',
      name: 'Negative Funding Entry',
      condition: 'perp.funding_rate < params.fundingThreshold AND perp.liquidity > params.minLiquidity',
      action: 'signal.LONG_PERP size=available_capital * 0.1 hedge_ratio=params.hedgeRatio',
      enabled: true,
      weight: 1.0,
      description: 'Enter arbitrage when funding rate is sufficiently negative'
    },
    {
      id: 'funding-rate-monitoring',
      name: 'Funding Rate Monitoring',
      condition: 'position.exists() AND perp.next_funding_rate > -0.005',
      action: 'signal.PREPARE_EXIT reason="funding_reversal"',
      enabled: true,
      weight: 0.8,
      description: 'Monitor for funding rate reversal'
    },
    {
      id: 'liquidity-check',
      name: 'Liquidity Validation',
      condition: 'perp.bid_ask_spread > 0.002 OR perp.liquidity < params.minLiquidity * 0.8',
      action: 'signal.REDUCE_POSITION ratio=0.3 reason="liquidity_risk"',
      enabled: true,
      weight: 1.0,
      description: 'Reduce position when liquidity deteriorates'
    },
    {
      id: 'funding-collection',
      name: 'Funding Payment Collection',
      condition: 'position.exists() AND time.is_funding_time()',
      action: 'metrics.RECORD_FUNDING funding=perp.current_funding_rate',
      enabled: true,
      weight: 1.0,
      description: 'Record funding payments for analysis'
    }
  ],
  
  successCriteria: [
    {
      name: 'Funding Yield',
      target: 12,
      unit: '%',
      timeframe: 'annualized',
      description: 'Target annual yield from funding payments',
      priority: 'primary'
    },
    {
      name: 'Risk-Free Alpha',
      target: 8,
      unit: '%',
      timeframe: '12M',
      description: 'Excess return over risk-free rate',
      priority: 'primary'
    },
    {
      name: 'Execution Efficiency',
      target: 95,
      unit: '%',
      timeframe: 'lifetime',
      description: 'Percentage of optimal funding captured',
      priority: 'secondary'
    }
  ],
  
  riskMetrics: {
    maxDrawdown: 0.03,
    volatilityTarget: 0.05,
    sharpeRatio: 2.0,
    maxLeverage: 3.0,
    positionSizing: 'fixed_fraction'
  },
  
  version: '1.0.0',
  author: 'ADAF Derivatives Team',
  created: '2024-01-15',
  tags: ['arbitrage', 'funding-rates', 'derivatives', 'market-neutral'],
  
  researchNotes: {
    methodology: 'Exploits structural inefficiencies in perpetual futures funding mechanisms by systematically capturing negative funding payments while maintaining market-neutral exposure.',
    keyInsights: [
      'Negative funding rates occur during high short interest periods',
      'Optimal position sizing balances funding income against execution costs',
      'Cross-exchange arbitrage amplifies returns in fragmented markets'
    ],
    marketAssumptions: [
      'Funding rate mechanisms remain consistent across exchanges',
      'Spot-perp arbitrage opportunities persist',
      'Market microstructure supports efficient hedging'
    ],
    limitations: [
      'Strategy capacity limited by funding rate frequency',
      'Execution costs can erode margins during low volatility',
      'Regulatory changes may affect perpetual markets'
    ],
    references: [
      'Kozhan, R. & Salmon, M. (2012). "The information content of option-implied skewness and kurtosis"',
      'Makarov, I. & Schoar, A. (2020). "Trading and arbitrage in cryptocurrency markets"'
    ]
  },
  
  displayConfig: {
    icon: '⚖️',
    color: '#8B5CF6',
    difficulty: 2,
    estimatedSetupTime: '30 minutes'
  }
};

/**
 * 4. Real-Yield Composite Strategy
 * Focuses on protocols with sustainable, real yield generation
 */
const realYieldCompositePreset: StrategyPreset = {
  id: 'real-yield-composite-v1',
  name: 'Real-Yield Composite Builder',
  category: 'yield-optimization',
  description: 'Constructs optimal portfolios of protocols generating sustainable real yield from operations',
  overview: 'Identifies and weights protocols based on real yield metrics, revenue sustainability, and token economics to build diversified yield-generating portfolios.',
  
  riskLevel: 'moderate',
  timeHorizon: 'long-term',
  marketConditions: ['any'],
  
  parameters: [
    {
      name: 'minRealYield',
      type: 'percentage',
      defaultValue: 3,
      min: 1,
      max: 15,
      description: 'Minimum real yield threshold for inclusion (%)',
      validation: { required: true }
    },
    {
      name: 'revenueGrowth',
      type: 'percentage',
      defaultValue: 10,
      min: 0,
      max: 100,
      description: 'Minimum quarterly revenue growth (%)',
      validation: { required: true }
    },
    {
      name: 'maxProtocols',
      type: 'number',
      defaultValue: 12,
      min: 5,
      max: 25,
      description: 'Maximum number of protocols in portfolio',
      validation: { required: true }
    },
    {
      name: 'rebalanceFrequency',
      type: 'selection',
      defaultValue: 'monthly',
      options: ['weekly', 'monthly', 'quarterly'],
      description: 'Portfolio rebalancing frequency',
      validation: { required: true }
    }
  ],
  
  rules: [
    {
      id: 'real-yield-screening',
      name: 'Real Yield Screening',
      condition: 'protocol.real_yield_pct > params.minRealYield AND protocol.revenue_growth_90d > params.revenueGrowth',
      action: 'signal.ADD_TO_UNIVERSE protocol=protocol.id weight=yield_score(protocol)',
      enabled: true,
      weight: 1.0,
      description: 'Screen protocols for minimum real yield and revenue growth'
    },
    {
      id: 'sustainability-filter',
      name: 'Yield Sustainability Filter',
      condition: 'protocol.yield_sustainability_score > 0.7 AND protocol.token_emissions_ratio < 0.3',
      action: 'signal.INCREASE_WEIGHT multiplier=1.2 reason="sustainable_yield"',
      enabled: true,
      weight: 0.9,
      description: 'Favor protocols with sustainable yield mechanisms'
    },
    {
      id: 'diversification-check',
      name: 'Sector Diversification',
      condition: 'portfolio.sector_concentration(protocol.sector) > 0.4',
      action: 'signal.LIMIT_WEIGHT max_weight=0.15 reason="diversification"',
      enabled: true,
      weight: 1.0,
      description: 'Limit sector concentration for diversification'
    },
    {
      id: 'yield-decline-exit',
      name: 'Yield Decline Exit',
      condition: 'protocol.real_yield_pct < params.minRealYield * 0.6 AND position.exists(protocol)',
      action: 'signal.REDUCE_POSITION ratio=0.5 reason="yield_decline"',
      enabled: true,
      weight: 1.0,
      description: 'Reduce position when yield falls significantly'
    }
  ],
  
  successCriteria: [
    {
      name: 'Portfolio Yield',
      target: 8,
      unit: '%',
      timeframe: 'annualized',
      description: 'Target portfolio real yield',
      priority: 'primary'
    },
    {
      name: 'Yield Stability',
      target: 85,
      unit: '%',
      timeframe: '12M',
      description: 'Percentage of months with positive real yield',
      priority: 'primary'
    },
    {
      name: 'Diversification Ratio',
      target: 0.7,
      unit: 'ratio',
      timeframe: 'rolling',
      description: 'Portfolio diversification effectiveness',
      priority: 'secondary'
    }
  ],
  
  riskMetrics: {
    maxDrawdown: 0.12,
    volatilityTarget: 0.18,
    sharpeRatio: 1.1,
    maxLeverage: 1.0,
    positionSizing: 'equal_risk_contribution'
  },
  
  version: '1.0.0',
  author: 'ADAF Yield Research',
  created: '2024-01-15',
  tags: ['real-yield', 'portfolio-construction', 'defi', 'sustainable'],
  
  researchNotes: {
    methodology: 'Constructs diversified portfolios of protocols generating real yield through fundamental analysis of revenue sources, token economics, and yield sustainability metrics.',
    keyInsights: [
      'Real yield protocols provide more stable returns during market downturns',
      'Revenue diversification across protocols reduces single-point-of-failure risks',
      'Token emission ratios are key indicators of yield sustainability'
    ],
    marketAssumptions: [
      'DeFi protocols continue transparent revenue reporting',
      'Real yield mechanisms remain economically viable',
      'Regulatory environment supports DeFi operations'
    ],
    limitations: [
      'Limited universe of protocols with significant real yield',
      'Yield calculations may vary across protocols',
      'Market sentiment can override fundamental values short-term'
    ],
    references: [
      'Aramonte, S. et al. (2021). "DeFi risks and the decentralisation illusion"',
      'Zetzsche, D. et al. (2020). "Decentralized Finance (DeFi): The Wall Street vs. Technology Divide"'
    ]
  },
  
  displayConfig: {
    icon: '💰',
    color: '#F59E0B',
    difficulty: 3,
    estimatedSetupTime: '50 minutes'
  }
};

/**
 * 5. Whale Watch Strategy
 * Tracks and follows large wallet movements
 */
const whaleWatchPreset: StrategyPreset = {
  id: 'whale-watch-v1',
  name: 'Whale Movement Tracker',
  category: 'whale-tracking',
  description: 'Monitors and follows trading patterns of identified whale wallets and institutional players',
  overview: 'Tracks large wallet movements and institutional flow patterns to identify early positioning opportunities before broader market recognition.',
  
  riskLevel: 'moderate',
  timeHorizon: 'short-term',
  marketConditions: ['bull', 'bear', 'volatile'],
  
  parameters: [
    {
      name: 'minTransactionSize',
      type: 'currency',
      defaultValue: 1000000,
      min: 100000,
      max: 10000000,
      description: 'Minimum transaction size to track ($)',
      validation: { required: true }
    },
    {
      name: 'followDelay',
      type: 'duration',
      defaultValue: '2h',
      description: 'Delay before following whale movements',
      validation: { required: true }
    },
    {
      name: 'whaleConfidence',
      type: 'percentage',
      defaultValue: 75,
      min: 50,
      max: 95,
      description: 'Minimum whale identification confidence (%)',
      validation: { required: true }
    },
    {
      name: 'maxFollowSize',
      type: 'percentage',
      defaultValue: 10,
      min: 1,
      max: 25,
      description: 'Maximum position size as % of whale transaction',
      validation: { required: true }
    }
  ],
  
  rules: [
    {
      id: 'whale-accumulation',
      name: 'Whale Accumulation Detection',
      condition: 'whale.transaction_size > params.minTransactionSize AND whale.confidence > params.whaleConfidence AND whale.action == "BUY"',
      action: 'signal.FOLLOW_BUY token=whale.token size=min(whale.size * params.maxFollowSize/100, max_position_size) delay=params.followDelay',
      enabled: true,
      weight: 1.0,
      description: 'Follow whale accumulation patterns'
    },
    {
      id: 'whale-distribution',
      name: 'Whale Distribution Detection',
      condition: 'whale.transaction_size > params.minTransactionSize AND whale.confidence > params.whaleConfidence AND whale.action == "SELL"',
      action: 'signal.FOLLOW_SELL token=whale.token ratio=0.3 delay=params.followDelay',
      enabled: true,
      weight: 0.8,
      description: 'Follow whale distribution patterns'
    },
    {
      id: 'smart-money-flow',
      name: 'Smart Money Flow Analysis',
      condition: 'aggregate_whale_flow(token, 24h) > token.market_cap * 0.02',
      action: 'signal.BUY token=token confidence=0.9 size=flow_based_sizing(aggregate_whale_flow)',
      enabled: true,
      weight: 0.9,
      description: 'Follow aggregate smart money flows'
    },
    {
      id: 'whale-reversal',
      name: 'Whale Position Reversal',
      condition: 'whale.recent_action != whale.historical_bias AND position.exists(whale.token)',
      action: 'signal.REASSESS position=whale.token reason="whale_reversal"',
      enabled: true,
      weight: 1.0,
      description: 'Reassess when whales reverse positions'
    }
  ],
  
  successCriteria: [
    {
      name: 'Whale Alpha',
      target: 12,
      unit: '%',
      timeframe: '12M',
      description: 'Excess return from whale following',
      priority: 'primary'
    },
    {
      name: 'Follow Accuracy',
      target: 70,
      unit: '%',
      timeframe: 'lifetime',
      description: 'Percentage of profitable whale follows',
      priority: 'primary'
    },
    {
      name: 'Detection Speed',
      target: 95,
      unit: '%',
      timeframe: 'rolling',
      description: 'Whale movements detected within target delay',
      priority: 'secondary'
    }
  ],
  
  riskMetrics: {
    maxDrawdown: 0.10,
    volatilityTarget: 0.20,
    sharpeRatio: 1.3,
    maxLeverage: 2.0,
    positionSizing: 'volatility_scaled'
  },
  
  version: '1.0.0',
  author: 'ADAF On-Chain Analytics',
  created: '2024-01-15',
  tags: ['whale-tracking', 'on-chain', 'smart-money', 'flow-analysis'],
  
  researchNotes: {
    methodology: 'Uses on-chain analytics to identify and track large wallet movements, then systematically follows confirmed whale trading patterns with appropriate delays and position sizing.',
    keyInsights: [
      'Whale movements often precede major price movements by 2-6 hours',
      'Aggregated smart money flows provide stronger signals than individual transactions',
      'Whale reversal patterns indicate potential trend changes'
    ],
    marketAssumptions: [
      'On-chain data remains transparent and accessible',
      'Whale wallets can be reliably identified and tracked',
      'Large transactions continue to move markets predictably'
    ],
    limitations: [
      'Privacy coins and mixer usage can obscure whale movements',
      'False positives from exchange internal transfers',
      'Whale behavior may adapt to tracking systems'
    ],
    references: [
      'Cong, L.W. et al. (2021). "Crypto wash trading"',
      'Makarov, I. & Schoar, A. (2022). "Blockchain analysis of the bitcoin market"'
    ]
  },
  
  displayConfig: {
    icon: '🐋',
    color: '#0891B2',
    difficulty: 4,
    estimatedSetupTime: '55 minutes'
  }
};

/**
 * 6. Regulatory Catalyst Calendar Strategy
 * Trades based on regulatory events and calendar-driven catalysts
 */
const regCatalystCalendarPreset: StrategyPreset = {
  id: 'reg-catalyst-calendar-v1',
  name: 'Regulatory Catalyst Calendar',
  category: 'regulatory-catalyst',
  description: 'Systematically trades regulatory events, policy announcements, and scheduled catalysts',
  overview: 'Maintains a comprehensive calendar of regulatory events and systematically positions ahead of high-impact announcements using historical pattern analysis.',
  
  riskLevel: 'aggressive',
  timeHorizon: 'intraday',
  marketConditions: ['volatile', 'any'],
  
  parameters: [
    {
      name: 'eventImpactThreshold',
      type: 'percentage',
      defaultValue: 5,
      min: 1,
      max: 20,
      description: 'Minimum expected price impact for event inclusion (%)',
      validation: { required: true }
    },
    {
      name: 'positionWindow',
      type: 'duration',
      defaultValue: '48h',
      description: 'Time window before event to establish position',
      validation: { required: true }
    },
    {
      name: 'eventTypes',
      type: 'selection',
      defaultValue: 'all',
      options: ['all', 'fed', 'sec', 'treasury', 'international'],
      description: 'Types of regulatory events to track',
      validation: { required: false }
    },
    {
      name: 'confidenceLevel',
      type: 'percentage',
      defaultValue: 80,
      min: 60,
      max: 95,
      description: 'Minimum prediction confidence for position entry',
      validation: { required: true }
    }
  ],
  
  rules: [
    {
      id: 'catalyst-positioning',
      name: 'Pre-Event Positioning',
      condition: 'event.time_to_event <= duration_to_hours(params.positionWindow) AND event.impact_prediction >= params.eventImpactThreshold AND event.confidence >= params.confidenceLevel',
      action: 'signal.POSITION_FOR_EVENT event=event.id direction=event.predicted_direction size=event_sizing(event.impact_prediction)',
      enabled: true,
      weight: 1.0,
      description: 'Position ahead of high-impact regulatory events'
    },
    {
      id: 'surprise-reaction',
      name: 'Event Surprise Reaction',
      condition: 'event.actual_outcome != event.expected_outcome AND event.surprise_magnitude > 0.3',
      action: 'signal.REACT_TO_SURPRISE direction=surprise_direction(event) size=surprise_sizing(event.surprise_magnitude)',
      enabled: true,
      weight: 0.9,
      description: 'React to unexpected event outcomes'
    },
    {
      id: 'post-event-exit',
      name: 'Post-Event Position Management',
      condition: 'event.is_concluded() AND position.event_related(event.id)',
      action: 'signal.MANAGE_POST_EVENT position=event.related_position target_exit=event.conclusion_time + 4h',
      enabled: true,
      weight: 1.0,
      description: 'Manage positions after event conclusion'
    },
    {
      id: 'calendar-clustering',
      name: 'Event Calendar Clustering',
      condition: 'calendar.events_in_window(7d).count() > 3 AND calendar.cumulative_impact > 10',
      action: 'signal.REDUCE_RISK_FOR_PERIOD reason="event_clustering" period=7d',
      enabled: true,
      weight: 0.8,
      description: 'Reduce risk during clustered event periods'
    }
  ],
  
  successCriteria: [
    {
      name: 'Event Alpha',
      target: 20,
      unit: '%',
      timeframe: '12M',
      description: 'Excess return from event-driven positions',
      priority: 'primary'
    },
    {
      name: 'Prediction Accuracy',
      target: 75,
      unit: '%',
      timeframe: 'lifetime',
      description: 'Accuracy of event outcome predictions',
      priority: 'primary'
    },
    {
      name: 'Event Coverage',
      target: 90,
      unit: '%',
      timeframe: 'rolling',
      description: 'Percentage of relevant events captured',
      priority: 'secondary'
    }
  ],
  
  riskMetrics: {
    maxDrawdown: 0.15,
    volatilityTarget: 0.30,
    sharpeRatio: 1.5,
    maxLeverage: 3.0,
    positionSizing: 'event_impact_scaled'
  },
  
  version: '1.0.0',
  author: 'ADAF Policy Research',
  created: '2024-01-15',
  tags: ['regulatory', 'events', 'calendar', 'policy-driven'],
  
  researchNotes: {
    methodology: 'Systematically tracks regulatory calendar events and uses machine learning models trained on historical event outcomes to predict market reactions and optimal positioning strategies.',
    keyInsights: [
      'Regulatory events show consistent pre-announcement drift patterns',
      'Event clustering amplifies individual event impacts',
      'Surprise magnitude is more predictive than absolute outcomes'
    ],
    marketAssumptions: [
      'Regulatory events continue to significantly impact markets',
      'Historical patterns remain predictive of future reactions',
      'Event information remains publicly available in advance'
    ],
    limitations: [
      'Model performance may degrade with changing political landscape',
      'High volatility during major event periods',
      'Risk of regulatory changes affecting strategy viability'
    ],
    references: [
      'Lucca, D.O. & Moench, E. (2015). "The pre-FOMC announcement drift"',
      'Cieslak, A. et al. (2019). "Stock returns over the FOMC cycle"'
    ]
  },
  
  displayConfig: {
    icon: '📅',
    color: '#DC2626',
    difficulty: 5,
    estimatedSetupTime: '75 minutes'
  }
};

// DSL Code for additional strategies
const negativeFundingDSL = `
// Negative Funding Rate Arbitrage Strategy DSL
strategy "Negative Funding Arbitrage" {
  universe = perpetual_contracts_filtered(
    min_liquidity: params.minLiquidity,
    exchanges: params.exchanges != "all" ? [params.exchanges] : null
  )
  
  features = {
    current_funding: perp.current_funding_rate,
    next_funding: perp.predicted_next_funding_rate,
    funding_trend: linear_regression(perp.funding_history_24h, 1).slope,
    
    liquidity_score: perp.average_daily_volume / perp.bid_ask_spread,
    basis: perp.mark_price - spot.price,
    basis_normalized: basis / spot.price,
    
    short_interest: perp.open_interest_short / perp.total_open_interest,
    funding_velocity: derivative(perp.funding_rate_8h_ma, 1)
  }
  
  signals = {
    strong_negative_funding: current_funding < params.fundingThreshold,
    sustainable_negative: funding_trend < -0.001 AND next_funding < params.fundingThreshold * 0.8,
    
    adequate_liquidity: liquidity_score > 1000 AND perp.bid_ask_spread < 0.002,
    basis_convergence: abs(basis_normalized) < 0.005,
    
    high_short_interest: short_interest > 0.6,
    funding_acceleration: funding_velocity < -0.0005
  }
  
  entry_conditions = {
    primary: strong_negative_funding AND adequate_liquidity,
    enhanced: sustainable_negative AND basis_convergence,
    aggressive: funding_acceleration AND high_short_interest
  }
  
  position_management = {
    hedge_ratio: params.hedgeRatio / 100,
    max_leverage: 3.0,
    funding_collection_frequency: "8h",
    
    exit_triggers: {
      funding_reversal: next_funding > -0.005,
      liquidity_degradation: liquidity_score < 500,
      basis_divergence: abs(basis_normalized) > 0.015,
      profit_target: position.funding_pnl > position.notional * 0.02
    }
  }
  
  risk_management = {
    max_positions: 5,
    correlation_limit: 0.7,
    funding_stop_loss: current_funding > 0.005
  }
}`;

const realYieldCompositeDSL = `
// Real-Yield Composite Strategy DSL
strategy "Real-Yield Composite Builder" {
  universe = defi_protocols_with_real_yield(
    min_yield: params.minRealYield,
    min_revenue_growth: params.revenueGrowth
  )
  
  scoring_model = {
    // Yield quality metrics
    real_yield_score: normalize(protocol.real_yield_pct, 0, 20),
    yield_sustainability: protocol.revenue_sources.diversification_ratio * protocol.yield_stability_90d,
    emission_efficiency: 1 - (protocol.token_emissions_value / protocol.total_revenue),
    
    // Growth and momentum
    revenue_growth_score: normalize(protocol.revenue_growth_90d, 0, 100),
    tvl_stability: 1 - rolling_cv(protocol.tvl_30d, 30),
    user_growth: normalize(protocol.active_users_growth_30d, -50, 100),
    
    // Token economics
    token_utility_score: protocol.governance_power * protocol.fee_sharing_ratio,
    buyback_yield: protocol.token_buybacks_90d / protocol.market_cap,
    
    // Risk factors
    smart_contract_risk: 1 - protocol.audit_score,
    regulatory_risk: protocol.regulatory_compliance_score,
    centralization_risk: 1 - protocol.decentralization_score
  }
  
  composite_score = weighted_average([
    (real_yield_score, 0.25),
    (yield_sustainability, 0.20),
    (revenue_growth_score, 0.15),
    (token_utility_score, 0.15),
    (tvl_stability, 0.10),
    (user_growth, 0.10),
    (emission_efficiency, 0.05)
  ]) * (1 - max(smart_contract_risk, regulatory_risk, centralization_risk) * 0.5)
  
  portfolio_construction = {
    selection: top_n(protocols.ranked_by(composite_score), params.maxProtocols),
    
    weighting_scheme: risk_parity_with_yield_tilt(
      base_weights: equal_risk_contribution(selection),
      yield_tilt: yield_score_weights(selection),
      tilt_strength: 0.3
    ),
    
    constraints: {
      min_weight: 0.02,
      max_weight: 0.15,
      sector_max: 0.40,
      max_correlation: 0.60
    }
  }
  
  rebalancing = {
    frequency: params.rebalanceFrequency,
    triggers: {
      score_change: composite_score_change > 0.2,
      yield_decline: protocol.real_yield_pct < params.minRealYield * 0.7,
      risk_breach: protocol.risk_score > threshold
    },
    
    transaction_costs: 0.003,
    rebalance_threshold: 0.05
  }
}`;

// Additional templates
export const additionalStrategyTemplates: StrategyTemplate[] = [
  {
    preset: negativeFundingPreset,
    dslCode: negativeFundingDSL,
    exampleParameters: {
      fundingThreshold: -0.01,
      minLiquidity: 1000000,
      hedgeRatio: 95,
      exchanges: 'binance'
    },
    validationSchema: {
      fundingThreshold: { min: -0.05, max: 0, type: 'number' },
      minLiquidity: { min: 100000, type: 'number' },
      hedgeRatio: { min: 80, max: 100, type: 'number' }
    }
  },
  {
    preset: realYieldCompositePreset,
    dslCode: realYieldCompositeDSL,
    exampleParameters: {
      minRealYield: 3,
      revenueGrowth: 10,
      maxProtocols: 12,
      rebalanceFrequency: 'monthly'
    },
    validationSchema: {
      minRealYield: { min: 1, max: 15, type: 'number' },
      revenueGrowth: { min: 0, max: 100, type: 'number' },
      maxProtocols: { min: 5, max: 25, type: 'number' }
    }
  },
  {
    preset: whaleWatchPreset,
    dslCode: '', // Will add DSL in next file
    exampleParameters: {
      minTransactionSize: 1000000,
      followDelay: '2h',
      whaleConfidence: 75,
      maxFollowSize: 10
    },
    validationSchema: {
      minTransactionSize: { min: 100000, type: 'number' },
      whaleConfidence: { min: 50, max: 95, type: 'number' },
      maxFollowSize: { min: 1, max: 25, type: 'number' }
    }
  },
  {
    preset: regCatalystCalendarPreset,
    dslCode: '', // Will add DSL in next file
    exampleParameters: {
      eventImpactThreshold: 5,
      positionWindow: '48h',
      eventTypes: 'fed',
      confidenceLevel: 80
    },
    validationSchema: {
      eventImpactThreshold: { min: 1, max: 20, type: 'number' },
      confidenceLevel: { min: 60, max: 95, type: 'number' }
    }
  }
];

export { 
  negativeFundingPreset, 
  realYieldCompositePreset, 
  whaleWatchPreset, 
  regCatalystCalendarPreset 
};