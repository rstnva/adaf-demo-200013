// DSL mínima basada en expresiones tipo "funding<0 48h", "tvl.drop>=0.12 24h"
export type RuleExpr =
  | { kind: 'keyword'; field: 'news.title'|'news.summary'; anyOf: string[]; severity?: 'med'|'high' }
  | { kind: 'tvl.drop'; protocol?: string; minDropPct: number; windowH: number }
  | { kind: 'guardrail'; key: 'slippage'|'LTV'|'HF'|'RealYield'; op: '<='|'>='; value: number };

export interface Evaluated {
  pass: boolean;
  reason?: string;
  derived?: Record<string, unknown>;
}
