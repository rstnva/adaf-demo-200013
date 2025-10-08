import { NextRequest, NextResponse } from 'next/server';
import { createRetryRequest } from '@/lib/dqp/incidents';
import { DqpRetryRequest, DqpRetryResponse } from '@/types/dqp';
import { incApiRequest } from '@/lib/metrics';

/**
 * POST /api/actions/dqp/retry
 * 
 * Body: { source: string, agentCode: string, type?: string, actor: string }
 * Response: { ok: boolean, queued: boolean }
 * 
 * Creates audit trail for retry request. queued=false since no backend implemented yet.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as DqpRetryRequest;
    
    // Validate required fields
    if (!body.source || !body.agentCode || !body.actor) {
      incApiRequest('dqp_retry', 'POST', 400);
      return NextResponse.json(
        { error: 'Missing required fields: source, agentCode, actor' },
        { status: 400 }
      );
    }

    // Sanitize actor field
    if (body.actor.length > 120) {
      incApiRequest('dqp_retry', 'POST', 400);
      return NextResponse.json(
        { error: 'Actor field too long (max 120 characters)' },
        { status: 400 }
      );
    }

    // Create retry request (audit only)
    const result = await createRetryRequest(
      body.source,
      body.agentCode,
      body.type,
      body.actor
    );

    const response: DqpRetryResponse = result;

    incApiRequest('dqp_retry', 'POST', 200);
    return NextResponse.json(response);

  } catch (error) {
    console.error('DQP retry error:', error);
    incApiRequest('dqp_retry', 'POST', 500);
    
    return NextResponse.json(
      { error: 'Failed to create retry request' },
      { status: 500 }
    );
  }
}