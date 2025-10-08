// Tipos TS compartidos para WSP
export type EtfFlow = { date: string; asset: 'BTC'|'ETH'; issuer?: string; netFlowUSD: number; cumFlowUSD?: number };
export type RatesFx = { dxy: number; ust2y: number; ust10y: number; spread2s10s: number; ts: number };
export type Indices = { spx: number; ndx: number; vix: number; ts: number; dChange?: { spx: number; ndx: number; vix: number } };
export type Catalyst = { date: string; time?: string; kind: 'FOMC'|'CPI'|'OPEX'|'UNLOCK'|'EARNINGS'; title: string; importance: 'low'|'med'|'high' };
export type WspsScore = { score: number; color: 'green'|'yellow'|'red'; factors: Array<{ name: string; weight: number; value: number; contribution: number }>; ts: number };
export type WspEvent = { id: string; kind: 'FLUSH_REBOUND'|'BASIS_CLEAN'|'REDUCE_LEVERAGE'|'ROTATE_RWA'; rationale: string[]; sizingNote: string; guardrails: string[]; ts: number };
