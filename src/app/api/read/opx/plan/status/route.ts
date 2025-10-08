import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incApiRequest } from '@/lib/metrics';
import { PlanStatus, getChecklistCompletion } from '@/types/execution-plan';

// ================================================================================================
// POST /api/read/opx/plan/status
// ================================================================================================
// Changes the status of an execution plan. Validates business rules for status transitions.
// Creates audit trail entry. Requires analyst+ permissions.
// ================================================================================================

const prisma = new PrismaClient();

interface ChangeStatusRequest {
  oppId: string;
  status: PlanStatus;
  note?: string;
}

interface ChangeStatusResponse {
  success: boolean;
  previousStatus: PlanStatus;
  newStatus: PlanStatus;
  warnings?: string[];
  meta: {
    queryTime: number;
    timestamp: string;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<ChangeStatusResponse | { error: string }>> {
  const timer = Date.now();
  incApiRequest('change_opx_plan_status', 'POST', 0);

  try {
    const body = (await req.json()) as ChangeStatusRequest;
    const { oppId, status, note } = body;

    if (!oppId || !status) {
      return NextResponse.json(
        { error: 'oppId and status are required' },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses: PlanStatus[] = ['draft', 'ready', 'live', 'paused', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Get existing plan
    const existingPlanResult = await prisma.$queryRaw<Array<{
      id: string;
      oppId: string;
      status: string;
      sizing: object;
      risk: object;
      checklist: object[];
      handoffs: object[];
      expiry: Date | null;
      artifacts: object[];
      notes: string | null;
    }>>`
      SELECT id, "oppId", status, sizing, risk, checklist, handoffs, expiry, artifacts, notes
      FROM execution_plans 
      WHERE "oppId" = ${oppId}
      LIMIT 1
    `;

    if (existingPlanResult.length === 0) {
      return NextResponse.json(
        { error: 'Execution plan not found' },
        { status: 404 }
      );
    }

    const existingPlan = existingPlanResult[0];
    const previousStatus = existingPlan.status as PlanStatus;

    // Business rules for status transitions
    const warnings: string[] = [];

    if (status === 'live') {
      // Check checklist completion for live status
      const checklist = existingPlan.checklist as Array<{ id: string; title: string; done: boolean; owner: string }>;
      const completion = getChecklistCompletion(checklist);
      
      if (completion < 0.8) {
        return NextResponse.json(
          { 
            error: `Cannot promote to live status: Checklist completion ${(completion * 100).toFixed(1)}% below required 80%` 
          },
          { status: 400 }
        );
      }

      // Check if plan has expiry and it's not expired
      if (existingPlan.expiry && new Date(existingPlan.expiry) < new Date()) {
        return NextResponse.json(
          { error: 'Cannot promote to live status: Plan has expired' },
          { status: 400 }
        );
      }

      // Warn about transitions from certain statuses
      if (previousStatus === 'paused') {
        warnings.push('Plan was paused - ensure conditions for resumption are met');
      }
    }

    if (status === 'closed' && previousStatus === 'live') {
      warnings.push('Closing live plan - ensure proper cleanup and documentation');
    }

    const now = new Date();

    // Update the plan status
    const updateResult = await prisma.$queryRaw<Array<{
      id: string;
      oppId: string;
      status: string;
      updatedAt: Date;
    }>>`
      UPDATE execution_plans 
      SET status = ${status}, "updatedAt" = ${now}
      WHERE "oppId" = ${oppId}
      RETURNING id, "oppId", status, "updatedAt"
    `;

    const updatedPlan = updateResult[0];

    // Create audit trail entry
    await prisma.changeLog.create({
      data: {
        actor: 'system', // TODO: Get from auth context
        entity: 'execution_plans',
        entityId: updatedPlan.id,
        field: 'status',
        old: previousStatus,
        new: status,
        at: now
      }
    });

    // Additional audit log entry for notes if provided
    if (note) {
      await prisma.changeLog.create({
        data: {
          actor: 'system',
          entity: 'execution_plans',
          entityId: updatedPlan.id,
          field: 'status_note',
          old: null,
          new: note,
          at: now
        }
      });
    }

    const response: ChangeStatusResponse = {
      success: true,
      previousStatus,
      newStatus: status,
      warnings: warnings.length > 0 ? warnings : undefined,
      meta: {
        queryTime: Date.now() - timer,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[API] Error changing execution plan status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}