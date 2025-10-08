import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incApiRequest } from '@/lib/metrics';
import { 
  GetPlanResponse, 
  PlanStatus, 
  PlanSizing, 
  PlanRisk, 
  ChecklistTask, 
  Handoff, 
  Artifact 
} from '@/types/execution-plan';

const prisma = new PrismaClient();

/**
 * GET /api/read/opx/plan?oppId=...
 * 
 * Get execution plan for opportunity with context (limits, metrics)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const oppId = searchParams.get('oppId');

    if (!oppId) {
      incApiRequest('read_opx_plan', 'GET', 400);
      return NextResponse.json(
        { error: 'Missing oppId parameter' },
        { status: 400 }
      );
    }

    // Get opportunity details
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: oppId }
    });

    if (!opportunity) {
      incApiRequest('read_opx_plan', 'GET', 404);
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // Get execution plan if exists using raw query
    const executionPlanResult = await prisma.$queryRaw<Array<{
      id: string;
      oppId: string;
      createdAt: Date;
      updatedAt: Date;
      status: string;
      sizing: object;
      risk: object;
      checklist: object[];
      handoffs: object[];
      expiry: Date | null;
      artifacts: object[];
      notes: string | null;
    }>>`
      SELECT id, "oppId", "createdAt", "updatedAt", status,
             sizing, risk, checklist, handoffs, expiry, artifacts, notes
      FROM execution_plans 
      WHERE "oppId" = ${oppId}
      LIMIT 1
    `;

    const executionPlan = executionPlanResult.length > 0 ? executionPlanResult[0] : null;

    // Get current limits
    const limits = await prisma.limit.findMany({
      where: {
        key: {
          in: ['slippage', 'ltv', 'hf', 'realyield']
        }
      }
    });

    const limitsMap = limits.reduce((acc, limit) => {
      acc[limit.key] = limit.value;
      return acc;
    }, {} as Record<string, number>);

    // Get current runtime metrics (default values for demo)
    const metricsMap = {
      ltv: 0.65,        // Current LTV at 65%
      hf: 1.8,          // Health factor at 1.8
      slippage: 0.001,  // Current slippage at 0.1%
      realyield: 0.08,  // Real yield at 8%
      nav: 1000000      // NAV at $1M
    };

    // Calculate opportunity score and consensus (simplified)
    const metadata = (opportunity.metadata as Record<string, unknown>) || {};
    const score = typeof metadata.score === 'number' ? metadata.score : 0;
    const consensus = typeof metadata.consensus === 'number' ? metadata.consensus : 0;

    // Simple blocking calculation based on limits vs metrics
    const blocking: string[] = [];
    if (metricsMap.hf && metricsMap.hf < 1.6) blocking.push('Low Health Factor');
    if (metricsMap.realyield && metricsMap.realyield < 0.06) blocking.push('Low Real Yield');
    if (metricsMap.ltv && metricsMap.ltv > (limitsMap.ltv || 0.8)) blocking.push('High LTV');

    const response: GetPlanResponse = {
      plan: executionPlan ? {
        id: executionPlan.id,
        oppId: executionPlan.oppId,
        createdAt: executionPlan.createdAt.toISOString(),
        updatedAt: executionPlan.updatedAt.toISOString(),
        status: executionPlan.status as PlanStatus,
        sizing: executionPlan.sizing as PlanSizing,
        risk: executionPlan.risk as PlanRisk,
        checklist: executionPlan.checklist as ChecklistTask[],
        handoffs: executionPlan.handoffs as Handoff[],
        expiry: executionPlan.expiry?.toISOString() || null,
        artifacts: executionPlan.artifacts as Artifact[],
        notes: executionPlan.notes || undefined
      } : undefined,
      opp: {
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        status: opportunity.status,
        score,
        consensus,
        blocking,
        createdAt: opportunity.createdAt.toISOString()
      },
      limits: {
        slippage: limitsMap.slippage || 0.02,
        ltv: limitsMap.ltv || 0.8,
        hf: limitsMap.hf || 1.6,
        realyield: limitsMap.realyield || 0.06
      },
      metrics: {
        ltv: metricsMap.ltv || 0,
        hf: metricsMap.hf || 0,
        slippage: metricsMap.slippage || 0,
        realyield: metricsMap.realyield || 0,
        nav: metricsMap.nav || 0
      }
    };

    incApiRequest('read_opx_plan', 'GET', 200);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Get execution plan error:', error);
    incApiRequest('read_opx_plan', 'GET', 500);
    
    return NextResponse.json(
      { error: 'Failed to get execution plan' },
      { status: 500 }
    );
  }
}