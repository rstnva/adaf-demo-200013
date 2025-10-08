import { NextRequest, NextResponse } from 'next/server';
import { getDqpOverview } from '@/lib/dqp/calculations';
import { DqpOverviewQuery } from '@/types/dqp';
import { incApiRequest } from '@/lib/metrics';

/**
 * GET /api/read/dqp/overview.csv
 * 
 * Same query params as overview endpoint
 * Returns CSV format with headers: source,agentCode,type,lastTs,freshnessMin,lastCount24h,dupes24h,schemaErrors24h,status,notes
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters (same as overview)
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

    // Convert to CSV format
    const csvHeader = 'source,agentCode,type,lastTs,freshnessMin,lastCount24h,dupes24h,schemaErrors24h,status,notes\n';
    const csvRows = rows.map(row => {
      const fields = [
        escapeCsvField(row.source),
        escapeCsvField(row.agentCode),
        escapeCsvField(row.type),
        escapeCsvField(row.lastTs || ''),
        row.freshnessMin !== null ? row.freshnessMin.toString() : '',
        row.lastCount24h.toString(),
        row.dupes24h.toString(),
        row.schemaErrors24h.toString(),
        escapeCsvField(row.status),
        escapeCsvField(row.notes || '')
      ];
      return fields.join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    incApiRequest('dqp_overview_csv', 'GET', 200);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dqp-overview-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('DQP CSV export error:', error);
    incApiRequest('dqp_overview_csv', 'GET', 500);
    
    return NextResponse.json(
      { error: 'Failed to export DQP overview as CSV' },
      { status: 500 }
    );
  }
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
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