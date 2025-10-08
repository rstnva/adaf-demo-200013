/**
 * Strategy Presets Registry - Central Hub for Professional Templates
 * 
 * Exports all 6 professional strategy presets with complete DSL rules,
 * parameters, success criteria, and validation schemas.
 */

import { StrategyTemplate } from '../../types/strategyPresets';
import { strategyTemplates as coreTemplates } from './professionalPresets';
import { additionalStrategyTemplates } from './additionalPresets';

// Complete DSL for remaining strategies
const whaleWatchDSL = `
// Whale Movement Tracker Strategy DSL
strategy "Whale Movement Tracker" {
  whale_universe = identified_whales_filtered(
    min_confidence: params.whaleConfidence / 100,
    min_wallet_size: params.minTransactionSize * 10,
    activity_threshold: "active_7d"
  )
  
  monitoring_pipeline = {
    // Transaction detection
    large_transactions: whale_transactions_filtered(
      size_threshold: params.minTransactionSize,
      confidence_threshold: params.whaleConfidence / 100,
      time_window: "realtime"
    ),
    
    // Wallet analysis
    wallet_patterns: analyze_wallet_behavior(
      transaction_history: "90d",
      success_rate: wallet.historical_performance,
      holding_patterns: wallet.average_holding_period,
      coordination: detect_coordinated_movements(whale_universe)
    ),
    
    // Flow aggregation
    aggregate_flows: sum_whale_flows(
      tokens: all_tracked_tokens,
      time_windows: ["1h", "4h", "24h"],
      direction_bias: net_flow_direction,
      momentum: flow_acceleration
    )
  }
  
  signals = {
    // Individual whale signals
    whale_accumulation: transaction.type == "BUY" AND transaction.size > params.minTransactionSize,
    whale_distribution: transaction.type == "SELL" AND transaction.size > params.minTransactionSize,
    whale_position_change: abs(wallet.position_change_24h) > wallet.typical_position_size * 0.2,
    
    // Aggregate signals
    coordinated_buying: count(whale_accumulation_events_4h) >= 3 AND same_token(events),
    smart_money_flow: aggregate_flows.net_24h > token.daily_volume * 0.05,
    
    // Pattern recognition
    whale_reversal: whale.recent_actions != whale.historical_bias,
    institutional_flow: detect_institutional_pattern(transaction.characteristics)
  }
  
  position_logic = {
    follow_whale: {
      condition: whale_accumulation AND wallet.success_rate > 0.65,
      action: mirror_position(
        whale_transaction: transaction,
        follow_ratio: params.maxFollowSize / 100,
        delay: params.followDelay,
        max_position: account.max_position_size
      )
    },
    
    aggregate_follow: {
      condition: smart_money_flow AND coordinated_buying,
      action: position_based_on_flow(
        net_flow: aggregate_flows.net_24h,
        position_size: flow_based_sizing(aggregate_flows),
        confidence_adjustment: average_whale_confidence
      )
    },
    
    exit_logic: {
      whale_exit: whale_distribution AND position.exists(transaction.token),
      flow_reversal: aggregate_flows.direction_change AND aggregate_flows.magnitude > threshold,
      time_decay: position.age > whale.average_holding_period * 1.5,
      stop_loss: position.drawdown > 0.15
    }
  }
  
  risk_management = {
    position_limits: {
      max_whale_exposure: 0.3,
      max_token_concentration: 0.15,
      correlation_limit: 0.8
    },
    
    whale_validation: {
      min_track_record: "30d",
      min_success_rate: 0.55,
      blacklist_check: !whale.is_blacklisted
    }
  }
}`;

const regCatalystCalendarDSL = `
// Regulatory Catalyst Calendar Strategy DSL
strategy "Regulatory Catalyst Calendar" {
  event_calendar = regulatory_events_calendar(
    sources: ["fed", "sec", "treasury", "congress", "international"],
    lookback: "90d",
    lookahead: "30d",
    impact_threshold: params.eventImpactThreshold / 100
  )
  
  event_classification = {
    // Event categories
    monetary_policy: ["fomc_meeting", "fed_speech", "interest_rate_decision"],
    regulatory_policy: ["sec_ruling", "cftc_guidance", "treasury_statement"],
    legislative: ["congressional_hearing", "bill_introduction", "vote_schedule"],
    international: ["g20_meeting", "bis_report", "international_agreement"],
    
    // Impact prediction model
    impact_model: train_on_historical_events(
      features: [
        event.type,
        event.speaker_influence,
        event.market_context,
        event.surprise_potential,
        recent_market_volatility,
        event.timing_context
      ],
      target: historical_price_impact_24h,
      model_type: "gradient_boosting"
    )
  }
  
  prediction_engine = {
    // Event outcome prediction
    outcome_probability: predict_event_outcome(
      event: upcoming_event,
      market_expectations: extract_market_expectations(derivatives.pricing),
      historical_patterns: similar_events_analysis,
      sentiment_analysis: news_and_social_sentiment
    ),
    
    // Market reaction prediction
    reaction_model: predict_market_reaction(
      event_outcome: outcome_probability,
      market_positioning: current_market_positioning,
      volatility_regime: current_vol_regime,
      liquidity_conditions: market_liquidity_score
    ),
    
    // Surprise potential
    surprise_magnitude: abs(predicted_outcome - market_expectation) / historical_volatility
  }
  
  positioning_strategy = {
    pre_event: {
      condition: event.time_to_event <= duration_to_hours(params.positionWindow) 
                AND prediction_engine.confidence >= params.confidenceLevel / 100,
      
      action: establish_pre_event_position(
        direction: prediction_engine.predicted_direction,
        size: event_impact_sizing(
          predicted_impact: prediction_engine.impact_magnitude,
          confidence: prediction_engine.confidence,
          max_risk: 0.05
        ),
        instruments: select_optimal_instruments(event.affected_markets),
        hedging: calculate_hedge_ratio(event.uncertainty)
      )
    },
    
    event_reaction: {
      condition: event.is_occurring() OR event.surprise_magnitude > 0.3,
      
      action: react_to_event(
        surprise_direction: actual_vs_expected(event),
        reaction_speed: event.liquidity_impact,
        adjustment_size: surprise_magnitude * base_position_size
      )
    },
    
    post_event: {
      condition: event.is_concluded(),
      
      action: manage_post_event(
        position_review: assess_position_performance,
        exit_timing: event.typical_reaction_duration,
        profit_taking: position.unrealized_pnl > expected_profit * 0.8
      )
    }
  }
  
  calendar_management = {
    // Event clustering analysis
    clustering_risk: detect_event_clusters(
      time_window: "7d",
      cumulative_impact: sum(event.predicted_impact for event in cluster),
      market_capacity: estimate_market_absorption_capacity
    ),
    
    // Position sizing adjustments
    risk_scaling: adjust_position_sizes(
      base_size: individual_event_sizing,
      cluster_penalty: clustering_risk.impact_factor,
      volatility_adjustment: realized_vol / implied_vol,
      correlation_adjustment: cross_event_correlation
    ),
    
    // Portfolio coordination
    event_portfolio: coordinate_event_positions(
      max_concurrent_events: 3,
      correlation_limit: 0.6,
      sector_concentration: 0.4,
      total_event_exposure: 0.25
    )
  }
  
  performance_tracking = {
    event_attribution: track_performance_by_event_type,
    prediction_accuracy: rolling_accuracy_by_event_category,
    optimal_timing: analyze_optimal_entry_exit_timing,
    surprise_handling: evaluate_surprise_reaction_performance
  }
}`;

// Complete strategy templates registry
export const allStrategyTemplates: StrategyTemplate[] = [
  ...coreTemplates,
  ...additionalStrategyTemplates.slice(0, 2), // negativeFunding and realYield
  {
    // Update whale watch template with complete DSL
    ...additionalStrategyTemplates[2],
    dslCode: whaleWatchDSL
  },
  {
    // Update reg catalyst template with complete DSL
    ...additionalStrategyTemplates[3],
    dslCode: regCatalystCalendarDSL
  }
];

// Strategy categories for UI organization
export const strategyCategories = {
  'flow-analysis': {
    name: 'Flow Analysis',
    description: 'Strategies based on capital flow and volume analysis',
    icon: '📊',
    color: '#3B82F6'
  },
  'momentum': {
    name: 'Momentum',
    description: 'Trend-following and momentum-based strategies',
    icon: '🚀',
    color: '#10B981'
  },
  'funding-arbitrage': {
    name: 'Funding Arbitrage',
    description: 'Market-neutral arbitrage opportunities',
    icon: '⚖️',
    color: '#8B5CF6'
  },
  'yield-optimization': {
    name: 'Yield Optimization',
    description: 'Sustainable yield generation strategies',
    icon: '💰',
    color: '#F59E0B'
  },
  'whale-tracking': {
    name: 'Whale Tracking',
    description: 'Smart money and large player analysis',
    icon: '🐋',
    color: '#0891B2'
  },
  'regulatory-catalyst': {
    name: 'Regulatory Catalysts',
    description: 'Event-driven regulatory trading',
    icon: '📅',
    color: '#DC2626'
  }
};

// Utility functions
export function getStrategyByCategory(category: string): StrategyTemplate[] {
  return allStrategyTemplates.filter(template => 
    template.preset.category === category
  );
}

export function getStrategyById(id: string): StrategyTemplate | undefined {
  return allStrategyTemplates.find(template => 
    template.preset.id === id
  );
}

export function getStrategiesByRiskLevel(riskLevel: string): StrategyTemplate[] {
  return allStrategyTemplates.filter(template => 
    template.preset.riskLevel === riskLevel
  );
}

export function getStrategiesByTimeHorizon(timeHorizon: string): StrategyTemplate[] {
  return allStrategyTemplates.filter(template => 
    template.preset.timeHorizon === timeHorizon
  );
}

export function validateStrategyParameters(
  strategyId: string, 
  parameters: Record<string, any>
): { valid: boolean; errors: string[] } {
  const template = getStrategyById(strategyId);
  if (!template) {
    return { valid: false, errors: ['Strategy not found'] };
  }
  
  const errors: string[] = [];
  const schema = template.validationSchema;
  
  Object.entries(parameters).forEach(([key, value]) => {
    const rule = schema[key];
    if (!rule) return;
    
    if (rule.type === 'number') {
      if (typeof value !== 'number') {
        errors.push(`${key} must be a number`);
      } else {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${key} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${key} must be at most ${rule.max}`);
        }
      }
    }
    
    if (rule.type === 'string' && rule.pattern) {
      if (!new RegExp(rule.pattern).test(String(value))) {
        errors.push(`${key} format is invalid`);
      }
    }
  });
  
  return { valid: errors.length === 0, errors };
}

// Export individual presets for direct access
export {
  etfFlowSpikePreset,
  tvlMomentumPreset
} from './professionalPresets';

export {
  negativeFundingPreset,
  realYieldCompositePreset,
  whaleWatchPreset,
  regCatalystCalendarPreset
} from './additionalPresets';