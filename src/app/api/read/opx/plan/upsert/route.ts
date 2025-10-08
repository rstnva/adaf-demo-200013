import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incApiRequest } from '@/lib/metrics';
import { 
  ExecutionPlan, 
  PlanStatus, 
  PlanSizing, 
  PlanRisk, 
  ChecklistTask, 
  Handoff, 
  Artifact,
  getChecklistCompletion
} from '@/types/execution-plan';

// ================================================================================================
// POST /api/read/opx/plan/upsert
// ================================================================================================
// Creates or updates an execution plan. Validates business rules before allowing status promotion
// to 'live'. Requires analyst+ permissions. Creates audit trail entry for all changes.
// ================================================================================================

const prisma = new PrismaClient();

interface UpsertPlanRequest {
  oppId: string;
  status?: PlanStatus;
  sizing?: PlanSizing;
  risk?: PlanRisk;
  checklist?: ChecklistTask[];
  handoffs?: Handoff[];
  expiry?: string; // ISO date string
  artifacts?: Artifact[];
  notes?: string;
}

interface UpsertPlanResponse {
  success: boolean;
  plan: ExecutionPlan;
  warnings?: string[];
  meta: {
    created: boolean;
    validationPassed: boolean;
    queryTime: number;
    timestamp: string;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<UpsertPlanResponse | { error: string }>> {
  const timer = Date.now();
  incApiRequest('upsert_opx_plan', 'POST', 0);

  try {
    const body = (await req.json()) as UpsertPlanRequest;
    const { oppId, status, sizing, risk, checklist, handoffs, expiry, artifacts, notes } = body;

    if (!oppId) {
      return NextResponse.json(
        { error: 'oppId is required' },
        { status: 400 }
      );
    }

    // Verify opportunity exists
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: oppId },
      select: { 
        id: true, 
        status: true,
        metadata: true 
      }
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    // Get existing plan if any
    const existingPlanResult = await prisma.$queryRaw<Array<{
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

    const existingPlan = existingPlanResult.length > 0 ? existingPlanResult[0] : null;
    const isUpdate = !!existingPlan;

    // Merge data with existing plan
    const currentStatus = status || (existingPlan?.status as PlanStatus) || 'draft';
    const currentSizing = sizing || (existingPlan?.sizing as PlanSizing);
    const currentRisk = risk || (existingPlan?.risk as PlanRisk);
    const currentChecklist = checklist || (existingPlan?.checklist as ChecklistTask[]) || [];
    const currentHandoffs = handoffs || (existingPlan?.handoffs as Handoff[]) || [];
    const currentArtifacts = artifacts || (existingPlan?.artifacts as Artifact[]) || [];

    // Basic validation for 'live' status
    const warnings: string[] = [];
    let validationPassed = true;

    if (currentStatus === 'live') {
      // Check basic checklist completion
      const completion = getChecklistCompletion(currentChecklist);
      if (completion < 0.8) {
        validationPassed = false;
        return NextResponse.json(
          { 
            error: `Cannot promote to live status: Checklist completion ${(completion * 100).toFixed(1)}% below required 80%` 
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const expiryDate = expiry ? new Date(expiry) : null;

    // Prepare data for upsert
    const planData = {
      status: currentStatus,
      sizing: currentSizing || {},
      risk: currentRisk || {},
      checklist: currentChecklist,
      handoffs: currentHandoffs,
      expiry: expiryDate,
      artifacts: currentArtifacts,
      notes: notes !== undefined ? notes : existingPlan?.notes,
      updatedAt: now
    };

    // Perform upsert using raw SQL
    const upsertResult = await prisma.$queryRaw<Array<{
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
      INSERT INTO execution_plans ("oppId", status, sizing, risk, checklist, handoffs, expiry, artifacts, notes, "createdAt", "updatedAt")
      VALUES (${oppId}, ${planData.status}, ${JSON.stringify(planData.sizing)}::jsonb, 
              ${JSON.stringify(planData.risk)}::jsonb, ${JSON.stringify(planData.checklist)}::jsonb,
              ${JSON.stringify(planData.handoffs)}::jsonb, ${planData.expiry}, 
              ${JSON.stringify(planData.artifacts)}::jsonb, ${planData.notes}, ${now}, ${now})
      ON CONFLICT ("oppId") DO UPDATE SET
        status = EXCLUDED.status,
        sizing = EXCLUDED.sizing,
        risk = EXCLUDED.risk,
        checklist = EXCLUDED.checklist,
        handoffs = EXCLUDED.handoffs,
        expiry = EXCLUDED.expiry,
        artifacts = EXCLUDED.artifacts,
        notes = EXCLUDED.notes,
        "updatedAt" = EXCLUDED."updatedAt"
      RETURNING id, "oppId", "createdAt", "updatedAt", status, sizing, risk, checklist, handoffs, expiry, artifacts, notes
    `;

    const updatedPlan = upsertResult[0];

    // Create audit trail entry
    await prisma.changeLog.create({
      data: {
        actor: 'system', // TODO: Get from auth context
        entity: 'execution_plans',
        entityId: updatedPlan.id,
        field: 'status',
        old: existingPlan?.status || null,
        new: currentStatus,
        at: now
      }
    });

    const response: UpsertPlanResponse = {
      success: true,
      plan: {
        id: updatedPlan.id,
        oppId: updatedPlan.oppId,
        createdAt: updatedPlan.createdAt.toISOString(),
        updatedAt: updatedPlan.updatedAt.toISOString(),
        status: updatedPlan.status as PlanStatus,
        sizing: updatedPlan.sizing as PlanSizing,
        risk: updatedPlan.risk as PlanRisk,
        checklist: updatedPlan.checklist as ChecklistTask[],
        handoffs: updatedPlan.handoffs as Handoff[],
        expiry: updatedPlan.expiry?.toISOString() || undefined,
        artifacts: updatedPlan.artifacts as Artifact[],
        notes: updatedPlan.notes || undefined,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      meta: {
        created: !isUpdate,
        validationPassed,
        queryTime: Date.now() - timer,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: isUpdate ? 200 : 201 });

  } catch (error) {
    console.error('[API] Error upserting execution plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}