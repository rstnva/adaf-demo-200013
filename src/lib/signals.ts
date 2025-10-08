// Signal evaluation logic for Semáforo LAV
import { CurrentEtfMetrics } from './ssv';

export type FundingSign = 'negativo' | 'neutro' | 'positivo';
export type StablecoinSlope = 'up' | 'flat' | 'down';
export type SemaforoState = 'green' | 'yellow' | 'red';

export interface SignalInputs {
  ssvCurrent: CurrentEtfMetrics | null;
  fundingBtcSign: FundingSign;
  stablecoinMcapSlope: StablecoinSlope;
  historicalInflows?: Array<{ date: string; dailyNetInflow: number }>; // Last few days
}

export interface SemaforoResult {
  state: SemaforoState;
  basisClean: boolean;
  triggers: string[];
  recommendation: string;
}

export function evaluateSemaforo(inputs: SignalInputs): SemaforoResult {
  const { ssvCurrent, fundingBtcSign, stablecoinMcapSlope, historicalInflows } = inputs;
  
  const triggers: string[] = [];
  let basisClean = false;
  
  // Current daily inflow check
  const currentInflow = ssvCurrent?.dailyNetInflow.value || 0;
  const isCurrentInflowNegative = currentInflow < 0;
  
  // Historical inflow trend (if available)
  const recentNegativeInflows = historicalInflows 
    ? historicalInflows.slice(-2).filter(item => item.dailyNetInflow < 0).length 
    : 0;
  
  const hasConsistentNegativeInflows = recentNegativeInflows >= 2 || isCurrentInflowNegative;
  
  // Cumulative inflow trend
  const cumInflowSlope = ssvCurrent?.cumulativeNetInflow.value || 0;
  const isCumInflowDecreasing = cumInflowSlope < 0;
  
  // Basis Clean signal
  if (hasConsistentNegativeInflows && fundingBtcSign === 'negativo') {
    basisClean = true;
    triggers.push('Basis Clean: Negative inflows + negative funding detected');
  }
  
  // Red state triggers
  if (isCurrentInflowNegative) {
    triggers.push('Daily net inflow is negative');
  }
  
  if (isCumInflowDecreasing) {
    triggers.push('Cumulative inflow trend declining');
  }
  
  if (ssvCurrent && stablecoinMcapSlope !== 'up') {
    triggers.push(`Stablecoin market cap not growing (${stablecoinMcapSlope})`);
  }
  
  if (fundingBtcSign === 'negativo') {
    triggers.push('BTC funding rates negative');
  }
  
  // State determination
  let state: SemaforoState = 'green';
  let recommendation = 'Continue current allocation strategy';
  
  // Red: Multiple negative indicators
  const redConditions = [
    isCurrentInflowNegative,
    isCumInflowDecreasing, 
    ssvCurrent ? stablecoinMcapSlope !== 'up' : false // Only consider if we have data
  ].filter(Boolean).length;
  
  if (redConditions >= 2) {
    state = 'red';
    recommendation = 'Consider rotating subsidies to RWA/gold temporarily. Monitor for reversal signals.';
  } 
  // Yellow: Some concerns but not critical
  else if (redConditions === 1 || fundingBtcSign === 'negativo') {
    state = 'yellow';
    recommendation = 'Exercise caution. Monitor inflow patterns and funding rates closely.';
  }
  
  // Basis clean overrides to at least yellow
  if (basisClean && state === 'green') {
    state = 'yellow';
    recommendation = 'Basis Clean detected. Consider tactical positioning adjustments.';
  }
  
  return {
    state,
    basisClean,
    triggers,
    recommendation
  };
}

// Utility function to determine funding sign from rate
export function getFundingSign(rate: number): FundingSign {
  if (rate < -0.01) return 'negativo'; // < -1%
  if (rate > 0.01) return 'positivo';  // > +1%
  return 'neutro';
}

// Utility to determine stablecoin slope from recent data
export function getStablecoinSlope(recentMcaps: number[]): StablecoinSlope {
  if (recentMcaps.length < 2) return 'flat';
  
  const recent = recentMcaps.slice(-2);
  const change = (recent[1] - recent[0]) / recent[0];
  
  if (change > 0.02) return 'up';    // > 2% growth
  if (change < -0.02) return 'down'; // > 2% decline
  return 'flat';
}