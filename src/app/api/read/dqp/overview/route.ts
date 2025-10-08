import { NextRequest, NextResponse } from 'next/server';
import { getDqpOverview } from '@/lib/dqp/calculations';
import { DqpOverviewResponse, DqpOverviewQuery } from '@/types/dqp';
import { incApiRequest } from '@/lib/metrics';

/**
 * GET /api/read/dqp/overview
 * 
 * Query params:
 * - status: 'ok' | 'warn' | 'fail' | 'any' (default: 'any')
 * - agent: 'NM' | 'OC' | 'OF' | 'DV' | 'MX' | 'OP' | 'any' (default: 'any')
 * - source: string (default: 'any')
 * - type: string (default: 'any')  
 * - limit: number (default: 500, max: 1000)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    incApiRequest('dqp_overview', 'GET', 200);

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const query: DqpOverviewQuery = {
      status: validateStatus(searchParams.get('status')),
      agent: validateAgent(searchParams.get('agent')),
      source: searchParams.get('source') || 'any',
      type: searchParams.get('type') || 'any',
      limit: validateLimit(searchParams.get('limit'))
    };

    // Get DQP overview data
    const rows = await getDqpOverview({
      status: query.status === 'any' ? undefined : query.status,
      agent: query.agent === 'any' ? undefined : query.agent,
      source: query.source === 'any' ? undefined : query.source,
      type: query.type === 'any' ? undefined : query.type,
      limit: query.limit
    });

    const response: DqpOverviewResponse = {
      rows,
      generatedAt: new Date().toISOString()
    };

    const duration = Date.now() - startTime;
    console.log(`DQP overview: ${rows.length} rows in ${duration}ms`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('DQP overview error:', error);
    incApiRequest('dqp_overview', 'GET', 500);
    
    return NextResponse.json(
      { error: 'Failed to get DQP overview' },
      { status: 500 }
    );
  }
}

function validateStatus(status: string | null): 'ok' | 'warn' | 'fail' | 'any' {
  if (!status) return 'any';
  if (['ok', 'warn', 'fail', 'any'].includes(status)) {
    return status as 'ok' | 'warn' | 'fail' | 'any';
  }
  return 'any';
}

function validateAgent(agent: string | null): 'NM' | 'OC' | 'OF' | 'DV' | 'MX' | 'OP' | 'any' {
  if (!agent) return 'any';
  if (['NM', 'OC', 'OF', 'DV', 'MX', 'OP', 'any'].includes(agent)) {
    return agent as 'NM' | 'OC' | 'OF' | 'DV' | 'MX' | 'OP' | 'any';
  }
  return 'any';
}

function validateLimit(limitStr: string | null): number {
  if (!limitStr) return 500;
  const limit = parseInt(limitStr, 10);
  if (isNaN(limit)) return 500;
  return Math.min(Math.max(limit, 1), 1000); // Clamp between 1-1000
}