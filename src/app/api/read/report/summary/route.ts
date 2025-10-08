import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { incApiRequest } from '@/lib/metrics';
import { ReportSummary, ReportRange } from '@/types/reports';

// ================================================================================================
// GET /api/read/report/summary
// ================================================================================================
// Returns NAV and flows time series for charting and analysis.
// Supports configurable date ranges with fallback to synthetic data.
// ================================================================================================

const prisma = new PrismaClient();

function generateSyntheticNavSeries(days: number): ReportSummary['navSeries'] {
  const series = [];
  const today = new Date();
  const baseNav = 1000000; // $1M base NAV

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate smooth upward trend with some volatility
    const trend = 1 + (days - i) * 0.002; // 0.2% daily growth trend
    const volatility = 1 + (Math.sin(i * 0.3) * 0.05); // 5% volatility
    const navUsd = Math.round(baseNav * trend * volatility);

    series.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      navUsd
    });
  }

  return series;
}

function generateSyntheticFlowSeries(days: number): ReportSummary['flowSeries'] {
  const series = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate realistic flows - mostly zero with occasional activity
    const isActiveDay = Math.random() < 0.1; // 10% of days have flows
    const inUsd = isActiveDay ? Math.round(Math.random() * 50000) : 0;
    const outUsd = isActiveDay ? Math.round(Math.random() * 20000) : 0;

    series.push({
      date: date.toISOString().split('T')[0],
      inUsd,
      outUsd
    });
  }

  return series;
}

export async function GET(req: NextRequest): Promise<NextResponse<ReportSummary | { error: string }>> {
  incApiRequest('read_report_summary', 'GET', 0);

  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') as ReportRange) || 'last90d';

    // Validate range parameter
    const validRanges = ['last90d', 'last180d', 'last365d'];
    if (!validRanges.includes(range)) {
      return NextResponse.json(
        { error: `Invalid range. Must be one of: ${validRanges.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate days based on range
    const rangeDays = {
      'last90d': 90,
      'last180d': 180,
      'last365d': 365
    };
    const days = rangeDays[range];

    // Try to query real data from metrics table
    let navRows: Array<{ key: string; value: number; ts: Date }> = [];
    let flowRows: Array<{ key: string; value: number; ts: Date }> = [];

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      navRows = await prisma.$queryRaw<Array<{ key: string; value: number; ts: Date }>>`
        SELECT key, value::float8 AS value, ts
        FROM metrics
        WHERE key = 'nav.usd' AND ts >= ${cutoffDate}
        ORDER BY ts ASC
      `;

      flowRows = await prisma.$queryRaw<Array<{ key: string; value: number; ts: Date }>>`
        SELECT key, value::float8 AS value, ts
        FROM metrics
        WHERE key IN ('flows.in.usd', 'flows.out.usd') AND ts >= ${cutoffDate}
        ORDER BY ts ASC
      `;
    } catch (error) {
      console.warn('[API] Metrics table not available for summary, using synthetic data');
    }

    let navSeries: ReportSummary['navSeries'];
    let flowSeries: ReportSummary['flowSeries'];

    if (navRows.length > 0) {
      // Process real NAV data
      navSeries = navRows.map(row => ({
        date: row.ts.toISOString().split('T')[0],
        navUsd: row.value
      }));
    } else {
      // Generate synthetic NAV data
      navSeries = generateSyntheticNavSeries(days);
    }

    if (flowRows.length > 0) {
      // Process real flow data
      const flowsMap = new Map<string, { inUsd: number; outUsd: number }>();
      
      flowRows.forEach(row => {
        const date = row.ts.toISOString().split('T')[0];
        if (!flowsMap.has(date)) {
          flowsMap.set(date, { inUsd: 0, outUsd: 0 });
        }
        
        const flows = flowsMap.get(date)!;
        if (row.key === 'flows.in.usd') {
          flows.inUsd = row.value;
        } else if (row.key === 'flows.out.usd') {
          flows.outUsd = row.value;
        }
      });

      flowSeries = Array.from(flowsMap.entries()).map(([date, flows]) => ({
        date,
        ...flows
      }));
    } else {
      // Generate synthetic flow data
      flowSeries = generateSyntheticFlowSeries(days);
    }

    const summary: ReportSummary = {
      navSeries,
      flowSeries
    };

    return NextResponse.json(summary, {
      status: 200,
      headers: {
        'X-Data-Source': navRows.length > 0 ? 'metrics' : 'synthetic',
        'X-NAV-Points': navSeries.length.toString(),
        'X-Flow-Points': flowSeries.length.toString(),
        'X-Range-Days': days.toString()
      }
    });

  } catch (error) {
    console.error('[API] Error reading report summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}