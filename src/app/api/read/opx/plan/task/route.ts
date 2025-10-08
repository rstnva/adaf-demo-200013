import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incApiRequest } from '@/lib/metrics';
import { ChecklistTask } from '@/types/execution-plan';

// ================================================================================================
// POST /api/read/opx/plan/task
// ================================================================================================
// Toggles completion status of a checklist task within an execution plan.
// Updates the task and creates audit trail entry. Requires analyst+ permissions.
// ================================================================================================

const prisma = new PrismaClient();

interface ToggleTaskRequest {
  oppId: string;
  taskId: string;
  completed?: boolean; // If not provided, will toggle current state
  completedBy?: string;
}

interface ToggleTaskResponse {
  success: boolean;
  task: ChecklistTask;
  checklistCompletion: number; // 0-1 representing percentage completion
  meta: {
    queryTime: number;
    timestamp: string;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<ToggleTaskResponse | { error: string }>> {
  const timer = Date.now();
  incApiRequest('toggle_opx_plan_task', 'POST', 0);

  try {
    const body = (await req.json()) as ToggleTaskRequest;
    const { oppId, taskId, completed, completedBy } = body;

    if (!oppId || !taskId) {
      return NextResponse.json(
        { error: 'oppId and taskId are required' },
        { status: 400 }
      );
    }

    // Get existing plan and checklist
    const existingPlanResult = await prisma.$queryRaw<Array<{
      id: string;
      oppId: string;
      checklist: object[];
    }>>`
      SELECT id, "oppId", checklist
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
    const checklist = existingPlan.checklist as ChecklistTask[];

    // Find the task to toggle
    const taskIndex = checklist.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found in checklist' },
        { status: 404 }
      );
    }

    const currentTask = checklist[taskIndex];
    const now = new Date();
    const newCompletionState = completed !== undefined ? completed : !currentTask.done;

    // Update the task
    const updatedTask: ChecklistTask = {
      ...currentTask,
      done: newCompletionState,
      // Add completion metadata if completing the task
      ...(newCompletionState && {
        completedAt: now.toISOString(),
        completedBy: completedBy || 'system'
      }),
      // Remove completion metadata if uncompleting the task
      ...(!newCompletionState && {
        completedAt: undefined,
        completedBy: undefined
      })
    };

    // Update the checklist array
    const updatedChecklist = [...checklist];
    updatedChecklist[taskIndex] = updatedTask;

    // Save the updated checklist
    await prisma.$queryRaw`
      UPDATE execution_plans 
      SET checklist = ${JSON.stringify(updatedChecklist)}::jsonb, "updatedAt" = ${now}
      WHERE "oppId" = ${oppId}
    `;

    // Calculate new completion percentage
    const completedTasks = updatedChecklist.filter(task => task.done).length;
    const completionPercentage = updatedChecklist.length > 0 ? completedTasks / updatedChecklist.length : 0;

    // Create audit trail entry
    await prisma.changeLog.create({
      data: {
        actor: completedBy || 'system',
        entity: 'execution_plans',
        entityId: existingPlan.id,
        field: `checklist.task.${taskId}`,
        old: currentTask.done,
        new: newCompletionState,
        at: now
      }
    });

    const response: ToggleTaskResponse = {
      success: true,
      task: updatedTask,
      checklistCompletion: completionPercentage,
      meta: {
        queryTime: Date.now() - timer,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[API] Error toggling execution plan task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}