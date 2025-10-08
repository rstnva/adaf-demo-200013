import { chromium } from 'playwright';
import { ReportKpis, ReportPor, ReportSummary } from '@/types/reports';

// ================================================================================================
// PDF Generation Engine using Playwright
// ================================================================================================
// Generates institutional reports as PDFs from HTML templates with consistent styling.
// ================================================================================================

export interface PdfGenerationOptions {
  type: 'onepager' | 'quarterly';
  data: {
    kpis: ReportKpis;
    por: ReportPor;
    summary?: ReportSummary;
    quarter?: string;
    generatedAt: string;
    actor: string;
    notes?: string;
  };
}

export interface PdfGenerationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fileSizeBytes?: number;
}

/**
 * Generate institutional one-pager PDF report
 */
function generateOnePagerHtml(data: PdfGenerationOptions['data']): string {
  const { kpis, por, generatedAt, actor, notes } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ADAF — Institutional One-Pager</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #1f2937;
      background: white;
    }
    .page { 
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 0 auto;
      background: white;
    }
    .header { 
      text-align: center;
      margin-bottom: 24pt;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 12pt;
    }
    .logo { 
      font-size: 24pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.5pt;
    }
    .subtitle { 
      font-size: 12pt;
      color: #6b7280;
      margin-top: 4pt;
    }
    .kpis-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12pt;
      margin: 20pt 0;
    }
    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6pt;
      padding: 12pt;
      text-align: center;
    }
    .kpi-label {
      font-size: 9pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin-bottom: 4pt;
    }
    .kpi-value {
      font-size: 18pt;
      font-weight: 700;
      color: #111827;
    }
    .section-title {
      font-size: 14pt;
      font-weight: 600;
      color: #111827;
      margin: 16pt 0 8pt 0;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4pt;
    }
    .por-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0;
    }
    .por-table th,
    .por-table td {
      padding: 6pt 8pt;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .por-table th {
      background: #f3f4f6;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      color: #374151;
    }
    .por-table td {
      font-size: 10pt;
    }
    .amount {
      text-align: right;
      font-family: 'SF Mono', Consolas, monospace;
      font-size: 9pt;
    }
    .footer {
      margin-top: 20pt;
      padding-top: 12pt;
      border-top: 1px solid #e5e7eb;
      font-size: 8pt;
      color: #6b7280;
      text-align: center;
    }
    .meta-info {
      margin-top: 16pt;
      font-size: 9pt;
      color: #6b7280;
    }
    .nav-summary {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 6pt;
      padding: 12pt;
      margin: 12pt 0;
    }
    .nav-amount {
      font-size: 20pt;
      font-weight: 700;
      color: #1d4ed8;
      font-family: 'SF Mono', Consolas, monospace;
    }
    .flows {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8pt;
      margin-top: 8pt;
    }
    .flow-item {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
    }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="logo">ADAF</div>
      <div class="subtitle">Institutional One-Pager Report</div>
    </header>

    <div class="nav-summary">
      <div style="font-size: 10pt; color: #6b7280; margin-bottom: 4pt;">Net Asset Value</div>
      <div class="nav-amount">$${(kpis.navUsd || 0).toLocaleString()}</div>
      <div class="flows">
        <div class="flow-item">
          <span>Inflows:</span>
          <span class="positive">$${(kpis.flows?.in || 0).toLocaleString()}</span>
        </div>
        <div class="flow-item">
          <span>Outflows:</span>
          <span class="negative">-$${(kpis.flows?.out || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div class="section-title">Performance KPIs</div>
    <div class="kpis-grid">
      <div class="kpi-card">
        <div class="kpi-label">IRR</div>
        <div class="kpi-value">${(kpis.irr * 100).toFixed(1)}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">TVPI</div>
        <div class="kpi-value">${kpis.tvpi.toFixed(2)}x</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">MoIC</div>
        <div class="kpi-value">${kpis.moic.toFixed(2)}x</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">DPI</div>
        <div class="kpi-value">${kpis.dpi.toFixed(2)}x</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">RVPI</div>
        <div class="kpi-value">${kpis.rvpi.toFixed(2)}x</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Date</div>
        <div class="kpi-value" style="font-size: 10pt;">${new Date(kpis.ts).toLocaleDateString()}</div>
      </div>
    </div>

    <div class="section-title">Proof of Reserves</div>
    <table class="por-table">
      <thead>
        <tr>
          <th>Chain</th>
          <th>Custodian</th>
          <th>Addresses</th>
          <th class="amount">Assets (USD)</th>
        </tr>
      </thead>
      <tbody>
        ${por.chains.map(chain => `
          <tr>
            <td><strong>${chain.chain}</strong></td>
            <td>${chain.custodian || 'Self-custody'}</td>
            <td>${chain.addrCount}</td>
            <td class="amount">$${chain.assetsUsd.toLocaleString()}</td>
          </tr>
        `).join('')}
        <tr style="border-top: 2px solid #374151; font-weight: 600;">
          <td colspan="3"><strong>Total</strong></td>
          <td class="amount"><strong>$${por.totalUsd.toLocaleString()}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="meta-info">
      <div>Generated: ${new Date(generatedAt).toLocaleString()}</div>
      <div>By: ${actor}</div>
      ${notes ? `<div>Notes: ${notes}</div>` : ''}
    </div>

    <div class="footer">
      <div>ADAF — Institutional Investment Management</div>
      <div>This report contains confidential and proprietary information. Distribution is restricted.</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate institutional quarterly PDF report
 */
function generateQuarterlyHtml(data: PdfGenerationOptions['data']): string {
  const { kpis, por, quarter, generatedAt, notes } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ADAF — Quarterly Report ${quarter}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }
    .page { 
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      margin: 0 auto;
      background: white;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }
    .cover {
      text-align: center;
      padding-top: 40mm;
    }
    .cover .logo { 
      font-size: 36pt;
      font-weight: 700;
      color: #111827;
      letter-spacing: -1pt;
      margin-bottom: 12pt;
    }
    .cover .title { 
      font-size: 24pt;
      color: #374151;
      margin-bottom: 8pt;
    }
    .cover .quarter { 
      font-size: 18pt;
      color: #6b7280;
      margin-bottom: 40pt;
    }
    .section-title {
      font-size: 16pt;
      font-weight: 600;
      color: #111827;
      margin: 20pt 0 12pt 0;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 6pt;
    }
    .kpis-detailed {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16pt;
      margin: 16pt 0;
    }
    .kpi-detailed {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8pt;
      padding: 16pt;
    }
    .kpi-detailed .label {
      font-size: 10pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin-bottom: 6pt;
    }
    .kpi-detailed .value {
      font-size: 24pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8pt;
    }
    .kpi-detailed .description {
      font-size: 9pt;
      color: #6b7280;
      line-height: 1.3;
    }
    .methodology {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 6pt;
      padding: 12pt;
      margin: 16pt 0;
      font-size: 9pt;
    }
    .methodology .title {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 6pt;
    }
    .por-detailed {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
    }
    .por-detailed th,
    .por-detailed td {
      padding: 8pt;
      text-align: left;
      border: 1px solid #e5e7eb;
    }
    .por-detailed th {
      background: #f3f4f6;
      font-weight: 600;
      font-size: 10pt;
      text-transform: uppercase;
      color: #374151;
    }
    .disclaimer {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6pt;
      padding: 12pt;
      margin: 20pt 0;
      font-size: 8pt;
      line-height: 1.4;
    }
    .disclaimer .title {
      font-weight: 600;
      color: #991b1b;
      margin-bottom: 6pt;
    }
    .footer {
      position: fixed;
      bottom: 15mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #6b7280;
    }
    .page-number::after {
      content: counter(page);
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover">
    <div class="logo">ADAF</div>
    <div class="title">Quarterly Investment Report</div>
    <div class="quarter">${quarter || 'Q3 2025'}</div>
    
    <div style="margin-top: 40pt; font-size: 12pt; color: #6b7280;">
      <div>Institutional Grade</div>
      <div>Digital Asset Management</div>
    </div>
    
    <div style="position: absolute; bottom: 40mm; left: 0; right: 0; text-align: center; font-size: 9pt; color: #9ca3af;">
      Generated ${new Date(generatedAt).toLocaleDateString()}<br>
      Confidential & Proprietary
    </div>
  </div>

  <!-- KPIs & Performance Page -->
  <div class="page">
    <div class="section-title">Performance Overview</div>
    
    <div class="kpis-detailed">
      <div class="kpi-detailed">
        <div class="label">Internal Rate of Return</div>
        <div class="value">${(kpis.irr * 100).toFixed(1)}%</div>
        <div class="description">Annualized return rate accounting for timing and magnitude of cash flows</div>
      </div>
      <div class="kpi-detailed">
        <div class="label">Total Value / Paid-In</div>
        <div class="value">${kpis.tvpi.toFixed(2)}x</div>
        <div class="description">Total portfolio value relative to cumulative invested capital</div>
      </div>
      <div class="kpi-detailed">
        <div class="label">Multiple on Invested Capital</div>
        <div class="value">${kpis.moic.toFixed(2)}x</div>
        <div class="description">Gross return multiple before fees and carried interest</div>
      </div>
      <div class="kpi-detailed">
        <div class="label">Distributions / Paid-In</div>
        <div class="value">${kpis.dpi.toFixed(2)}x</div>
        <div class="description">Ratio of cumulative distributions to invested capital</div>
      </div>
    </div>

    <div class="methodology">
      <div class="title">Methodology Note</div>
      <div>Performance metrics calculated using industry-standard GIPS methodology. IRR computed using daily cash flows and mark-to-market valuations. All figures presented gross of management fees.</div>
    </div>

    <div class="section-title">Portfolio Summary</div>
    
    <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 8pt; padding: 16pt; margin: 12pt 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16pt; text-align: center;">
        <div>
          <div style="font-size: 10pt; color: #6b7280;">Net Asset Value</div>
          <div style="font-size: 20pt; font-weight: 700; color: #1d4ed8;">$${(kpis.navUsd || 0).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 10pt; color: #6b7280;">Inflows (QTD)</div>
          <div style="font-size: 16pt; font-weight: 600; color: #059669;">$${(kpis.flows?.in || 0).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 10pt; color: #6b7280;">Outflows (QTD)</div>
          <div style="font-size: 16pt; font-weight: 600; color: #dc2626;">$${(kpis.flows?.out || 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Proof of Reserves Page -->
  <div class="page">
    <div class="section-title">Proof of Reserves</div>
    
    <p style="margin: 12pt 0; font-size: 10pt; color: #6b7280;">
      On-chain verification of digital asset custody across multiple blockchains and custodial arrangements.
      All addresses and balances verified as of ${new Date(por.ts).toLocaleDateString()}.
    </p>

    <table class="por-detailed">
      <thead>
        <tr>
          <th>Blockchain</th>
          <th>Custodian</th>
          <th>Address Count</th>
          <th style="text-align: right;">Assets (USD)</th>
          <th>Last Verified</th>
        </tr>
      </thead>
      <tbody>
        ${por.chains.map(chain => `
          <tr>
            <td><strong>${chain.chain}</strong></td>
            <td>${chain.custodian || 'Self-custody'}</td>
            <td>${chain.addrCount}</td>
            <td style="text-align: right; font-family: monospace;">$${chain.assetsUsd.toLocaleString()}</td>
            <td style="font-size: 9pt; color: #6b7280;">${new Date(por.ts).toLocaleDateString()}</td>
          </tr>
        `).join('')}
        <tr style="border-top: 2px solid #374151; font-weight: 600; background: #f9fafb;">
          <td colspan="3"><strong>Total Verified Assets</strong></td>
          <td style="text-align: right; font-family: monospace;"><strong>$${por.totalUsd.toLocaleString()}</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="disclaimer">
      <div class="title">Important Disclaimers</div>
      <div>
        <strong>Risk Disclosure:</strong> Digital asset investments involve substantial risk of loss. Past performance does not guarantee future results.
        <strong>Methodology:</strong> IRR calculated using daily cash flows; TVPI and MoIC based on fair market valuations; DPI reflects actual distributions.
        <strong>Compliance:</strong> This report is prepared in accordance with AIFMD and institutional reporting standards.
        ${notes ? `<br><strong>Notes:</strong> ${notes}` : ''}
      </div>
    </div>
  </div>

  <div class="footer">
    <div>ADAF Institutional Investment Management | Confidential & Proprietary | Page <span class="page-number"></span></div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF from HTML content using Playwright
 */
export async function generatePdfFromHtml(
  htmlContent: string,
  outputPath: string
): Promise<PdfGenerationResult> {
  let browser;
  
  try {
    // Launch headless browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set content and wait for fonts/styles to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });
    
    // Generate PDF with institutional settings
    const pdfBuffer = await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    // Get file size
    const fileSizeBytes = pdfBuffer.length;

    return {
      success: true,
      filePath: outputPath,
      fileSizeBytes
    };

  } catch (error) {
    console.error('[PDF] Generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown PDF generation error'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Main PDF generation function
 */
export async function generateReport(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
  try {
    // Generate HTML content based on report type
    const htmlContent = options.type === 'onepager' 
      ? generateOnePagerHtml(options.data)
      : generateQuarterlyHtml(options.data);

    // Create output file path
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = options.type === 'onepager' 
      ? `OnePager_${timestamp}.pdf`
      : `Quarterly_${options.data.quarter || timestamp}.pdf`;
    
    const outputPath = `/tmp/${fileName}`;

    // Generate PDF
    const result = await generatePdfFromHtml(htmlContent, outputPath);
    
    if (result.success) {
      console.log(`[PDF] Generated ${options.type} report: ${fileName} (${result.fileSizeBytes} bytes)`);
    }

    return result;

  } catch (error) {
    console.error('[PDF] Report generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown report generation error'
    };
  }
}