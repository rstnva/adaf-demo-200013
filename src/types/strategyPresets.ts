/**
 * Strategy Preset Types and Interfaces
 * 
 * Professional research strategy templates with DSL rules, parameters,
 * success criteria, and automated validation.
 */

export type StrategyCategory = 
  | 'flow-analysis'
  | 'momentum'
  | 'funding-arbitrage'
  | 'yield-optimization'
  | 'whale-tracking'
  | 'regulatory-catalyst';

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';
export type TimeHorizon = 'intraday' | 'short-term' | 'medium-term' | 'long-term';
export type MarketCondition = 'bull' | 'bear' | 'sideways' | 'volatile' | 'any';

export interface StrategyParameter {
  name: string;
  type: 'number' | 'percentage' | 'duration' | 'currency' | 'selection';
  defaultValue: any;
  min?: number;
  max?: number;
  options?: string[];
  description: string;
  validation?: {
    required: boolean;
    pattern?: string;
    message?: string;
  };
}

export interface SuccessCriteria {
  name: string;
  target: number;
  unit: string;
  timeframe: string;
  description: string;
  priority: 'primary' | 'secondary';
  validationRule?: string;
}

export interface RiskMetrics {
  maxDrawdown: number;
  volatilityTarget: number;
  sharpeRatio: number;
  maxLeverage: number;
  stopLoss?: number;
  positionSizing: string;
}

export interface StrategyRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  weight?: number;
  enabled: boolean;
  description?: string;
}

export interface StrategyPreset {
  id: string;
  name: string;
  category: StrategyCategory;
  description: string;
  overview: string;
  
  // Strategy Configuration
  riskLevel: RiskLevel;
  timeHorizon: TimeHorizon;
  marketConditions: MarketCondition[];
  
  // Parameters and Rules
  parameters: StrategyParameter[];
  rules: StrategyRule[];
  successCriteria: SuccessCriteria[];
  riskMetrics: RiskMetrics;
  
  // Metadata
  version: string;
  author: string;
  created: string;
  tags: string[];
  
  // Implementation Details
  backtestConfig?: {
    startDate: string;
    endDate: string;
    benchmarks: string[];
    universe: string[];
  };
  
  // Professional Notes
  researchNotes: {
    methodology: string;
    keyInsights: string[];
    marketAssumptions: string[];
    limitations: string[];
    references: string[];
  };
  
  // UI Configuration
  displayConfig: {
    icon: string;
    color: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    estimatedSetupTime: string;
  };
}

export interface StrategyTemplate {
  preset: StrategyPreset;
  dslCode: string;
  exampleParameters: Record<string, any>;
  validationSchema: Record<string, any>;
}