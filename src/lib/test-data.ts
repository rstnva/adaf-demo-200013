// ================================================================================================
// Test Data and Smoke Tests for Módulo F — Reportería Institucional
// ================================================================================================
// Realistic seed data and validation tests for institutional reports system
// ================================================================================================

import type { ReportKpis, ReportPor, ReportSummary } from '@/types/reports';

/**
 * Realistic KPIs data for testing institutional reports
 */
export const seedKpisData: ReportKpis[] = [
  // Q3 2025 - Strong Performance
  {
    irr: 0.24,           // 24% annualized IRR
    tvpi: 1.48,          // Strong TVPI
    moic: 1.42,          // Good multiple
    dpi: 0.18,           // Some distributions
    rvpi: 1.24,          // High residual value
    navUsd: 4_250_000,   // $4.25M NAV
    flows: {
      in: 2_500_000,     // $2.5M inflows
      out: 450_000       // $450K outflows
    },
    ts: '2025-09-30T23:59:59Z'
  },
  // Q2 2025 - Moderate Performance
  {
    irr: 0.18,
    tvpi: 1.32,
    moic: 1.28,
    dpi: 0.12,
    rvpi: 1.16,
    navUsd: 3_180_000,
    flows: {
      in: 1_800_000,
      out: 320_000
    },
    ts: '2025-06-30T23:59:59Z'
  },
  // Q1 2025 - Market Entry
  {
    irr: 0.08,
    tvpi: 1.12,
    moic: 1.08,
    dpi: 0.02,
    rvpi: 1.06,
    navUsd: 1_850_000,
    flows: {
      in: 2_000_000,
      out: 85_000
    },
    ts: '2025-03-31T23:59:59Z'
  }
];

/**
 * Realistic Proof of Reserves data for testing
 */
export const seedPorData: ReportPor[] = [
  // Current comprehensive PoR
  {
    chains: [
      {
        chain: 'ETH',
        custodian: 'Coinbase Prime',
        addrCount: 28,
        assetsUsd: 1_950_000
      },
      {
        chain: 'BTC',
        custodian: 'Fireblocks',
        addrCount: 18,
        assetsUsd: 1_650_000
      },
      {
        chain: 'SOL',
        custodian: null, // Self-custody
        addrCount: 42,
        assetsUsd: 420_000
      },
      {
        chain: 'AVAX',
        custodian: 'Anchorage',
        addrCount: 15,
        assetsUsd: 180_000
      },
      {
        chain: 'MATIC',
        custodian: 'Coinbase Prime',
        addrCount: 22,
        assetsUsd: 150_000
      },
      {
        chain: 'ATOM',
        custodian: 'Fireblocks',
        addrCount: 8,
        assetsUsd: 85_000
      }
    ],
    totalUsd: 4_435_000,
    ts: '2025-09-29T12:00:00Z'
  }
];

/**
 * Realistic NAV and flows time series for charts
 */
export const seedSummaryData: ReportSummary = {
  navSeries: Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    // Simulate realistic NAV growth with some volatility
    const baseGrowth = 1.85e6; // Starting NAV
    const growthRate = 0.0015; // ~0.15% daily growth
    const volatility = 0.08;    // 8% daily volatility
    const trend = baseGrowth * Math.pow(1 + growthRate, i);
    const noise = trend * (Math.random() - 0.5) * volatility;
    
    return {
      date: date.toISOString().split('T')[0],
      navUsd: Math.round(trend + noise)
    };
  }),
  
  flowSeries: Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    // Simulate realistic flow patterns
    const weekday = date.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const monthDay = date.getDate();
    
    // More activity on business days and month-end
    const baseActivity = isWeekend ? 0.3 : 1.0;
    const monthEndBoost = monthDay > 25 ? 1.8 : 1.0;
    const activity = baseActivity * monthEndBoost;
    
    const inUsd = Math.random() < 0.3 ? 
      Math.round(Math.random() * 250000 * activity) : 0;
    const outUsd = Math.random() < 0.2 ? 
      Math.round(Math.random() * 150000 * activity) : 0;
    
    return {
      date: date.toISOString().split('T')[0],
      inUsd,
      outUsd
    };
  })
};

/**
 * Test scenarios for report generation
 */
export const testScenarios = [
  {
    name: 'Institutional OnePager - High Performance',
    type: 'onepager' as const,
    actor: 'institutional-reports@adaf.com',
    notes: 'Q3 2025 performance summary for institutional stakeholders',
    expectedFileSize: { min: 60000, max: 80000 } // 60-80KB
  },
  {
    name: 'Quarterly Report - Comprehensive Analysis',
    type: 'quarterly' as const,
    actor: 'compliance@adaf.com',
    quarter: '2025Q3',
    notes: 'Comprehensive quarterly analysis with regulatory compliance details',
    expectedFileSize: { min: 90000, max: 120000 } // 90-120KB
  },
  {
    name: 'Monthly OnePager - Standard Review',
    type: 'onepager' as const,
    actor: 'portfolio-manager@adaf.com',
    notes: 'Standard monthly performance review for portfolio committee',
    expectedFileSize: { min: 60000, max: 80000 }
  }
];

/**
 * Validation helpers for smoke tests
 */
export function validateKpisRealistic(kpis: ReportKpis): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // IRR should be reasonable for crypto funds (-200% to +200%)
  if (kpis.irr < -2 || kpis.irr > 2) {
    issues.push(`IRR ${(kpis.irr * 100).toFixed(1)}% is outside reasonable range`);
  }
  
  // TVPI should be positive
  if (kpis.tvpi <= 0) {
    issues.push(`TVPI ${kpis.tvpi} should be positive`);
  }
  
  // DPI + RVPI should approximately equal TVPI
  const sumCheck = Math.abs((kpis.dpi + kpis.rvpi) - kpis.tvpi);
  if (sumCheck > 0.1) {
    issues.push(`DPI + RVPI (${(kpis.dpi + kpis.rvpi).toFixed(2)}) should approximately equal TVPI (${kpis.tvpi.toFixed(2)})`);
  }
  
  // NAV should be reasonable for institutional fund
  if (kpis.navUsd < 0 || kpis.navUsd > 1e10) {
    issues.push(`NAV $${kpis.navUsd.toLocaleString()} is outside reasonable range`);
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

export function validatePorRealistic(por: ReportPor): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Should have at least 2 chains for diversification
  if (por.chains.length < 2) {
    issues.push(`Only ${por.chains.length} chain(s), expected diversification across multiple chains`);
  }
  
  // Each chain should have reasonable address count
  por.chains.forEach(chain => {
    if (chain.addrCount < 1 || chain.addrCount > 1000) {
      issues.push(`Chain ${chain.chain} has ${chain.addrCount} addresses, outside reasonable range`);
    }
    
    if (chain.assetsUsd < 0) {
      issues.push(`Chain ${chain.chain} has negative assets: $${chain.assetsUsd}`);
    }
  });
  
  // Total should match sum of chains
  const calculatedTotal = por.chains.reduce((sum, chain) => sum + chain.assetsUsd, 0);
  const totalDiff = Math.abs(calculatedTotal - por.totalUsd);
  if (totalDiff > 1000) { // Allow $1000 rounding difference
    issues.push(`Total USD mismatch: calculated $${calculatedTotal.toLocaleString()} vs reported $${por.totalUsd.toLocaleString()}`);
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Smoke test runner for report generation
 */
export async function runReportSmokeTests(): Promise<void> {
  console.log('🧪 Starting Módulo F smoke tests...\n');
  
  for (const scenario of testScenarios) {
    console.log(`📄 Testing: ${scenario.name}`);
    
    try {
      const response = await fetch(`/api/generate/report/${scenario.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: scenario.actor,
          notes: scenario.notes,
          ...(scenario.quarter ? { quarter: scenario.quarter } : {})
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const size = blob.size;
      
      // Validate file size
      if (size < scenario.expectedFileSize.min || size > scenario.expectedFileSize.max) {
        console.log(`   ⚠️  Warning: File size ${size} bytes outside expected range ${scenario.expectedFileSize.min}-${scenario.expectedFileSize.max}`);
      } else {
        console.log(`   ✅ File generated: ${size} bytes`);
      }
      
      // Check PDF header
      const arrayBuffer = await blob.arrayBuffer();
      const pdfHeader = new Uint8Array(arrayBuffer.slice(0, 4));
      const isPdf = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (isPdf) {
        console.log('   ✅ Valid PDF format');
      } else {
        console.log('   ❌ Invalid PDF format');
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('');
  }
  
  console.log('🎉 Smoke tests completed!');
}