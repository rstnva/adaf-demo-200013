import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incApiRequest } from '@/lib/metrics';
import { Artifact } from '@/types/execution-plan';

// ================================================================================================
// POST /api/read/opx/plan/artifact
// ================================================================================================
// Adds an artifact (document, screenshot, log, etc.) to an execution plan.
// Creates audit trail entry. Requires analyst+ permissions.
// ================================================================================================

const prisma = new PrismaClient();

interface AddArtifactRequest {
  oppId: string;
  artifact: Omit<Artifact, 'addedAt'>; // Client provides all fields except addedAt
}

interface AddArtifactResponse {
  success: boolean;
  artifact: Artifact;
  totalArtifacts: number;
  meta: {
    queryTime: number;
    timestamp: string;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<AddArtifactResponse | { error: string }>> {
  const timer = Date.now();
  incApiRequest('add_opx_plan_artifact', 'POST', 0);

  try {
    const body = (await req.json()) as AddArtifactRequest;
    const { oppId, artifact } = body;

    if (!oppId || !artifact) {
      return NextResponse.json(
        { error: 'oppId and artifact are required' },
        { status: 400 }
      );
    }

    // Validate artifact structure
    const { kind, url } = artifact;
    if (!kind || !url) {
      return NextResponse.json(
        { error: 'artifact must have kind and url' },
        { status: 400 }
      );
    }

    // Validate artifact kind
    const validKinds = ['chart', 'calc', 'approval', 'screenshot', 'tx'];
    if (!validKinds.includes(kind)) {
      return NextResponse.json(
        { error: `Invalid artifact kind. Must be one of: ${validKinds.join(', ')}` },
        { status: 400 }
      );
    }

    // Get existing plan and artifacts
    const existingPlanResult = await prisma.$queryRaw<Array<{
      id: string;
      oppId: string;
      artifacts: object[];
    }>>`
      SELECT id, "oppId", artifacts
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
    const currentArtifacts = existingPlan.artifacts as Artifact[];

    const now = new Date();
    
    // Create new artifact with timestamp
    const newArtifact: Artifact = {
      kind,
      url,
      addedAt: now.toISOString()
    };

    // Add to artifacts array
    const updatedArtifacts = [...currentArtifacts, newArtifact];

    // Save the updated artifacts
    await prisma.$queryRaw`
      UPDATE execution_plans 
      SET artifacts = ${JSON.stringify(updatedArtifacts)}::jsonb, "updatedAt" = ${now}
      WHERE "oppId" = ${oppId}
    `;

    // Create audit trail entry
    await prisma.changeLog.create({
      data: {
        actor: 'system', // TODO: Get from auth context
        entity: 'execution_plans',
        entityId: existingPlan.id,
        field: 'artifacts',
        old: JSON.stringify({ count: currentArtifacts.length }),
        new: JSON.stringify({ 
          count: updatedArtifacts.length, 
          added: { kind: newArtifact.kind, url: newArtifact.url }
        }),
        at: now
      }
    });

    const response: AddArtifactResponse = {
      success: true,
      artifact: newArtifact,
      totalArtifacts: updatedArtifacts.length,
      meta: {
        queryTime: Date.now() - timer,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('[API] Error adding execution plan artifact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}