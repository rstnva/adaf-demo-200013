import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incApiRequest } from '@/lib/metrics';
import { 
  ReportKpis, 
  ReportPeriod, 
  clampIrr, 
  validateKpis, 
  getDefaultKpis 
} from '@/types/reports';

// ================================================================================================
// GET /api/read/report/kpis
// ================================================================================================
// Returns institutional KPIs (IRR/TVPI/MoIC/DPI/RVPI) for specified period.
// Validates data completeness and provides fallbacks for missing values.
// ================================================================================================

const prisma = new PrismaClient();

export async function GET(req: NextRequest): Promise<NextResponse<ReportKpis | { error: string }>> {
  incApiRequest('read_report_kpis', 'GET', 0);

  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') as ReportPeriod) || 'q';

    // Validate period parameter
    if (!['q', 'y'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be "q" (quarterly) or "y" (yearly)' },
        { status: 400 }
      );
    }

    let metricsRows: Array<{ key: string; value: number; ts: Date }> = [];
    
    try {
      metricsRows = await prisma.$queryRaw<Array<{ key: string; value: number; ts: Date }>>`
        SELECT DISTINCT ON (key) key, value::float8 AS value, ts
        FROM metrics
        WHERE key IN ('irr.quarterly', 'irr.yearly', 'tvpi', 'moic', 'dpi', 'rvpi', 'nav.usd', 'flows.in.usd', 'flows.out.usd')
        ORDER BY key, ts DESC
      `;
    } catch (error) {
      console.warn('[API] Metrics table not available, using defaults');
      // Metrics table doesn't exist yet, use defaults
    }

    // Build metrics map
    const metricsMap = metricsRows.reduce((acc, metric) => {
      acc[metric.key] = metric.value;
      return acc;
    }, {} as Record<string, number>);

    // Select appropriate IRR based on period
    const irrKey = period === 'y' ? 'irr.yearly' : 'irr.quarterly';
    const rawIrr = metricsMap[irrKey] ?? 0;

    // Build KPIs with validation and fallbacks
    const kpis: ReportKpis = {
      irr: clampIrr(rawIrr),
      tvpi: metricsMap['tvpi'] ?? 1.0,
      moic: metricsMap['moic'] ?? 1.0,
      dpi: metricsMap['dpi'] ?? 0.0,
      rvpi: metricsMap['rvpi'] ?? 1.0,
      navUsd: metricsMap['nav.usd'] ?? 0,
      flows: {
        in: metricsMap['flows.in.usd'] ?? 0,
        out: metricsMap['flows.out.usd'] ?? 0
      },
      ts: new Date().toISOString()
    };

    // Validate KPIs and log warnings
    const validation = validateKpis(kpis);
    if (validation.warnings.length > 0) {
      console.warn(`[API] KPIs validation warnings: ${validation.warnings.join(', ')}`);
    }

    // If no data available, return defaults
    if (metricsRows.length === 0) {
      console.warn('[API] No metrics data available, returning defaults');
      const defaultKpis = getDefaultKpis();
      return NextResponse.json(defaultKpis, { 
        status: 200,
        headers: { 'X-Data-Source': 'default' }
      });
    }

    return NextResponse.json(kpis, { 
      status: 200,
      headers: { 
        'X-Data-Source': 'metrics',
        'X-Validation-Warnings': validation.warnings.length.toString()
      }
    });

  } catch (error) {
    console.error('[API] Error reading report KPIs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}