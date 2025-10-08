import { NextRequest, NextResponse } from 'next/server';
import { generateReport, PdfGenerationOptions } from '@/lib/pdf-generator';
import { getValidatedKpis, getValidatedPor, formatQuarter, isValidQuarter, type ReportKpis, type ReportPor } from '@/types/reports';
import { readFileSync } from 'fs';

// ================================================================================================
// POST /api/generate/report/quarterly — Generate Quarterly PDF Report
// ================================================================================================
// Generates comprehensive 3-6 page quarterly institutional report with detailed KPIs analysis,
// Proof of Reserves breakdown, performance methodology, and compliance disclosures.
// ================================================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body
    const body = await request.json();
    const { actor, notes, quarter: requestedQuarter } = body;

    if (!actor || typeof actor !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: actor' },
        { status: 400 }
      );
    }

    // Validate and set quarter
    let quarter = requestedQuarter;
    if (!quarter) {
      quarter = formatQuarter();
    } else if (!isValidQuarter(quarter)) {
      return NextResponse.json(
        { error: 'Invalid quarter format. Use YYYYQ# (e.g., 2025Q3)' },
        { status: 400 }
      );
    }

    // Fetch KPIs data for quarterly analysis
    let kpis: ReportKpis;
    try {
      // In production, query quarterly metrics
      // const kpisResult = await db.query(`
      //   SELECT 
      //     AVG(irr) as irr,
      //     AVG(tvpi) as tvpi, 
      //     AVG(moic) as moic,
      //     AVG(dpi) as dpi,
      //     AVG(rvpi) as rvpi,
      //     MAX(nav_usd) as nav_usd,
      //     SUM(flows_in) as flows_in,
      //     SUM(flows_out) as flows_out,
      //     MAX(ts) as ts
      //   FROM metrics 
      //   WHERE DATE_FORMAT(ts, '%Y-Q%q') = ?
      // `, [quarter]);
      
      // Enhanced quarterly data with realistic performance
      kpis = {
        irr: 0.18,         // 18% annualized for quarterly
        tvpi: 1.32,        // Strong performance
        moic: 1.25,        // Good multiple
        dpi: 0.15,         // Some distributions
        rvpi: 1.10,        // Residual value
        navUsd: 3_750_000, // Larger quarterly NAV
        flows: { in: 1_200_000, out: 280_000 }, // Quarterly flows
        ts: new Date().toISOString()
      };
      
      kpis = getValidatedKpis(kpis);
    } catch (error) {
      console.error('[Quarterly] KPIs fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quarterly KPI data' },
        { status: 500 }
      );
    }

    // Fetch comprehensive PoR data for quarterly review
    let por: ReportPor;
    try {
      // In production, query comprehensive custody data
      // const porResult = await db.query(`
      //   SELECT chain, custodian, addr_count, assets_usd, ts
      //   FROM proof_of_reserves 
      //   WHERE DATE_FORMAT(ts, '%Y-Q%q') = ? 
      //   ORDER BY assets_usd DESC
      // `, [quarter]);
      
      // Comprehensive quarterly PoR data
      por = {
        chains: [
          { chain: 'ETH', custodian: 'Coinbase Prime', addrCount: 24, assetsUsd: 1_650_000 },
          { chain: 'BTC', custodian: 'Fireblocks', addrCount: 16, assetsUsd: 1_800_000 },
          { chain: 'SOL', custodian: null, addrCount: 32, assetsUsd: 300_000 },
          { chain: 'AVAX', custodian: 'Anchorage', addrCount: 8, assetsUsd: 180_000 },
          { chain: 'MATIC', custodian: 'Coinbase Prime', addrCount: 12, assetsUsd: 120_000 }
        ],
        totalUsd: 4_050_000,
        ts: new Date().toISOString()
      };
      
      por = getValidatedPor(por);
    } catch (error) {
      console.error('[Quarterly] PoR fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quarterly Proof of Reserves data' },
        { status: 500 }
      );
    }

    // Generate quarterly PDF
    const generatedAt = new Date().toISOString();
    const pdfOptions: PdfGenerationOptions = {
      type: 'quarterly',
      data: {
        kpis,
        por,
        quarter,
        generatedAt,
        actor,
        notes
      }
    };

    const pdfResult = await generateReport(pdfOptions);

    if (!pdfResult.success) {
      console.error('[Quarterly] PDF generation failed:', pdfResult.error);
      return NextResponse.json(
        { error: `Quarterly PDF generation failed: ${pdfResult.error}` },
        { status: 500 }
      );
    }

    // Read generated PDF file
    const pdfBuffer = readFileSync(pdfResult.filePath!);
    
    // Comprehensive audit trail logging
    const auditLog = {
      action: 'generate_quarterly_pdf',
      actor,
      timestamp: generatedAt,
      report_type: 'quarterly',
      quarter,
      file_size_bytes: pdfResult.fileSizeBytes,
      notes,
      kpis_summary: {
        irr: kpis.irr,
        tvpi: kpis.tvpi,
        nav_usd: kpis.navUsd
      },
      por_summary: {
        chains_count: por.chains.length,
        total_usd: por.totalUsd
      },
      success: true
    };
    
    console.log('[Audit] Quarterly generation:', JSON.stringify(auditLog));

    // Enhanced Prometheus metrics
    // metrics.incrementCounter('adaf_pdf_reports_generated_total', { type: 'quarterly', quarter });
    // metrics.recordHistogram('adaf_pdf_generation_duration_ms', Date.now() - startTime, { type: 'quarterly' });
    // metrics.recordGauge('adaf_quarterly_nav_usd', kpis.navUsd, { quarter });
    // metrics.recordGauge('adaf_quarterly_por_usd', por.totalUsd, { quarter });

    // Return quarterly PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ADAF_Quarterly_${quarter}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'X-Generation-Time-Ms': (Date.now() - startTime).toString(),
        'X-File-Size-Bytes': pdfResult.fileSizeBytes!.toString(),
        'X-Report-Quarter': quarter,
        'X-Report-Type': 'quarterly'
      }
    });

  } catch (error) {
    console.error('[Quarterly] Generation error:', error);
    
    // Audit trail for errors
    const errorLog = {
      action: 'generate_quarterly_pdf',
      actor: 'unknown',
      timestamp: new Date().toISOString(),
      report_type: 'quarterly',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    console.log('[Audit] Quarterly error:', JSON.stringify(errorLog));

    return NextResponse.json(
      { error: 'Internal server error during quarterly PDF generation' },
      { status: 500 }
    );
  }
}