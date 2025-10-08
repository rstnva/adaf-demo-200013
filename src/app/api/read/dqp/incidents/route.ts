import { NextRequest, NextResponse } from 'next/server';
import { getDqpIncidents } from '@/lib/dqp/incidents';
import { DqpIncidentsResponse } from '@/types/dqp';
import { incApiRequest } from '@/lib/metrics';

/**
 * GET /api/read/dqp/incidents
 * 
 * Query params:
 * - kind: 'freshness' | 'duplicate' | 'schema' | 'backfill' | 'rate_limit' | 'provider_down' | 'any'
 * - source: string (default: 'any')
 * - agentCode: string (default: 'any')
 * - ack: '0' | '1' | 'any' (default: 'any')
 * - limit: number (default: 200, max: 500)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    incApiRequest('dqp_incidents', 'GET', 200);

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const kindParam = validateKind(searchParams.get('kind'));
    const sourceParam = searchParams.get('source') || 'any';
    const agentCodeParam = searchParams.get('agentCode') || 'any';
    const ackParam = validateAck(searchParams.get('ack'));
    const limitParam = validateLimit(searchParams.get('limit'));

    // Get DQP incidents data
    const items = await getDqpIncidents({
      kind: kindParam === 'any' ? undefined : kindParam,
      source: sourceParam === 'any' ? undefined : sourceParam,
      agentCode: agentCodeParam === 'any' ? undefined : agentCodeParam,
      ack: ackParam === 'any' ? undefined : ackParam,
      limit: limitParam
    });

    const response: DqpIncidentsResponse = {
      items,
      generatedAt: new Date().toISOString()
    };

    const duration = Date.now() - startTime;
    console.log(`DQP incidents: ${items.length} items in ${duration}ms`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('DQP incidents error:', error);
    incApiRequest('dqp_incidents', 'GET', 500);
    
    return NextResponse.json(
      { error: 'Failed to get DQP incidents' },
      { status: 500 }
    );
  }
}

function validateKind(kind: string | null): 'freshness' | 'duplicate' | 'schema' | 'backfill' | 'rate_limit' | 'provider_down' | 'any' {
  if (!kind) return 'any';
  if (['freshness', 'duplicate', 'schema', 'backfill', 'rate_limit', 'provider_down', 'any'].includes(kind)) {
    return kind as 'freshness' | 'duplicate' | 'schema' | 'backfill' | 'rate_limit' | 'provider_down' | 'any';
  }
  return 'any';
}

function validateAck(ack: string | null): '0' | '1' | 'any' {
  if (!ack) return 'any';
  if (['0', '1', 'any'].includes(ack)) {
    return ack as '0' | '1' | 'any';
  }
  return 'any';
}

function validateLimit(limitStr: string | null): number {
  if (!limitStr) return 200;
  const limit = parseInt(limitStr, 10);
  if (isNaN(limit)) return 200;
  return Math.min(Math.max(limit, 1), 500); // Clamp between 1-500
}