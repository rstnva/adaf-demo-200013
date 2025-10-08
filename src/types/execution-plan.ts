/**
 * OP-X Execution Planner Types
 */

export type PlanStatus = 'draft' | 'ready' | 'live' | 'paused' | 'closed';

export type Side = 'BUY' | 'SELL';
export type SlTpType = 'price' | 'time' | 'var';
export type SlTpUnit = '%' | 'usd' | 'h';
export type Role = 'Trading' | 'Ops' | 'Legal' | 'RI';
export type ArtifactKind = 'chart' | 'calc' | 'approval' | 'screenshot' | 'tx';

export interface PlanLeg {
  market: string;
  side: Side;
  qty: number;
  venue: string;
}

export interface PlanSizing {
  notionalPctNAV: number;
  legs?: PlanLeg[];
}

export interface StopLoss {
  type: SlTpType;
  value: number;
  unit: SlTpUnit;
}

export interface TakeProfit {
  type: SlTpType;
  value: number;
  unit: SlTpUnit;
}

export interface PlanRisk {
  sl?: StopLoss;
  tp?: TakeProfit;
  maxSlippagePct: number;
}

export interface ChecklistTask {
  id: string;
  title: string;
  done: boolean;
  owner: string;
}

export interface Handoff {
  role: Role;
  owner?: string;
  note?: string;
}

export interface Artifact {
  kind: ArtifactKind;
  url: string;
  addedAt: string;
}

export interface ExecutionPlan {
  id: string;
  oppId: string;
  createdAt: string;
  updatedAt: string;
  status: PlanStatus;
  sizing: PlanSizing;
  risk: PlanRisk;
  checklist: ChecklistTask[];
  handoffs: Handoff[];
  expiry: string | null;
  artifacts: Artifact[];
  notes?: string;
}

// API Request/Response types
export interface GetPlanResponse {
  plan?: ExecutionPlan;
  opp: {
    id: string;
    title: string;
    description: string;
    status: string;
    score: number;
    consensus: number;
    blocking: string[];
    createdAt: string;
  };
  limits: {
    slippage: number;
    ltv: number;
    hf: number;
    realyield: number;
  };
  metrics: {
    ltv: number;
    hf: number;
    slippage: number;
    realyield: number;
    nav: number;
  };
}

export interface CreateUpdatePlanRequest {
  oppId: string;
  patch: Partial<ExecutionPlan>;
  actor: string;
}

export interface ChangeStatusRequest {
  oppId: string;
  status: PlanStatus;
  actor: string;
  note?: string;
}

export interface ToggleTaskRequest {
  oppId: string;
  taskId: string;
  done: boolean;
  actor: string;
}

export interface AddArtifactRequest {
  oppId: string;
  artifact: {
    kind: ArtifactKind;
    url: string;
  };
  actor: string;
}

// Validation helpers
export function isValidSlTp(sl: StopLoss | TakeProfit): boolean {
  if (sl.type === 'price' && sl.unit === '%') {
    return sl.value >= 0 && sl.value <= 50;
  }
  if (sl.type === 'time' && sl.unit === 'h') {
    return sl.value >= 1 && sl.value <= 720;
  }
  return true;
}

export function getChecklistCompletion(checklist: ChecklistTask[]): number {
  if (checklist.length === 0) return 0;
  const completed = checklist.filter(task => task.done).length;
  return completed / checklist.length;
}

export function canPromoteToLive(
  plan: ExecutionPlan,
  limits: { slippage: number; ltv: number; hf: number; realyield: number },
  metrics: { ltv: number; hf: number; slippage: number; realyield: number }
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check slippage limit
  if (plan.risk.maxSlippagePct > limits.slippage) {
    reasons.push(`Max slippage ${plan.risk.maxSlippagePct}% exceeds limit ${limits.slippage}%`);
  }

  // Check LTV limit
  if (plan.sizing.notionalPctNAV > limits.ltv) {
    reasons.push(`Notional ${plan.sizing.notionalPctNAV}% exceeds LTV limit ${limits.ltv}%`);
  }

  // Check HF requirement
  if (metrics.hf < 1.6) {
    reasons.push(`Health Factor ${metrics.hf} below required 1.6`);
  }

  // Check RealYield requirement
  if (metrics.realyield < 0.06) {
    reasons.push(`Real Yield ${metrics.realyield} below required 6%`);
  }

  // Check checklist completion
  const completion = getChecklistCompletion(plan.checklist);
  if (completion < 0.8) {
    reasons.push(`Checklist completion ${(completion * 100).toFixed(1)}% below required 80%`);
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}