import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeDqpIncident } from '@/lib/dqp/incidents';
import { DqpAckRequest, DqpAckResponse } from '@/types/dqp';
import { incApiRequest } from '@/lib/metrics';

/**
 * POST /api/actions/dqp/ack
 * 
 * Body: { id: string | number, actor: string }
 * Response: { ok: boolean }
 * 
 * Acknowledges a DQP incident and creates audit trail
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as DqpAckRequest;
    
    // Validate required fields
    if (!body.id || !body.actor) {
      incApiRequest('dqp_ack', 'POST', 400);
      return NextResponse.json(
        { error: 'Missing required fields: id, actor' },
        { status: 400 }
      );
    }

    // Sanitize actor field
    if (body.actor.length > 120) {
      incApiRequest('dqp_ack', 'POST', 400);
      return NextResponse.json(
        { error: 'Actor field too long (max 120 characters)' },
        { status: 400 }
      );
    }

    // Acknowledge the incident
    await acknowledgeDqpIncident(body.id, body.actor);

    const response: DqpAckResponse = { ok: true };

    incApiRequest('dqp_ack', 'POST', 200);
    return NextResponse.json(response);

  } catch (error) {
    console.error('DQP ack error:', error);
    incApiRequest('dqp_ack', 'POST', 500);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to acknowledge incident' },
      { status: 500 }
    );
  }
}