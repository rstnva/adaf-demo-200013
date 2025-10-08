/**
 * Módulo F — Reportería Institucional 
 * Tipos TypeScript estrictos sin any para KPIs, PoR y PDFs
 */

// =============================================================================
// Core Report Data Types
// =============================================================================

export interface ReportKpis {
  irr: number;           // Internal Rate of Return [-2..+2] clamped
  tvpi: number;          // Total Value to Paid-In capital
  moic: number;          // Multiple on Invested Capital  
  dpi: number;           // Distributions to Paid-In capital
  rvpi: number;          // Residual Value to Paid-In capital
  navUsd: number;        // Net Asset Value in USD
  flows: {
    in: number;          // Inflows USD
    out: number;         // Outflows USD
  };
  ts: string;            // Timestamp ISO string
}

export interface ReportPor {
  chains: Array<{
    chain: string;       // 'ETH' | 'BTC' | 'SOL' | etc.
    custodian?: string;  // Optional custodian name
    addrCount: number;   // Number of addresses
    assetsUsd: number;   // Assets value in USD
  }>;
  totalUsd: number;      // Total PoR value across all chains
  ts: string;            // Timestamp ISO string
}

export interface ReportSummary {
  navSeries: Array<{
    date: string;        // YYYY-MM-DD format
    navUsd: number;      // NAV value for that date
  }>;
  flowSeries: Array<{
    date: string;        // YYYY-MM-DD format
    inUsd: number;       // Inflows for that date
    outUsd: number;      // Outflows for that date
  }>;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface GenerateReportRequest {
  actor: string;         // Max 120 chars, sanitized
  notes?: string;        // Optional notes, max 500 chars
  quarter?: string;      // For quarterly reports: 'YYYY Q1/Q2/Q3/Q4'
}

export interface GenerateReportResponse {
  ok: boolean;
  url: string;           // Path to generated PDF
  meta: {
    type: 'onepager' | 'quarterly';
    generatedAt: string;
    fileSizeBytes?: number;
  };
}

export interface ReportHistoryItem {
  id: string;
  type: 'onepager' | 'quarterly';
  period?: string;       // Quarter for quarterly reports
  url: string;
  createdAt: string;
  actor: string;
  notes?: string;
}

// =============================================================================
// Validation & Business Logic Types
// =============================================================================

export type ReportPeriod = 'q' | 'y'; // quarterly | yearly
export type ReportRange = 'last90d' | 'last180d' | 'last365d';
export type ReportType = 'onepager' | 'quarterly';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// =============================================================================
// Validation Helpers & Business Rules
// =============================================================================

/**
 * Clamp IRR to reasonable range to avoid synthetic outliers
 */
export function clampIrr(irr: number): number {
  if (isNaN(irr) || !isFinite(irr)) return 0;
  return Math.max(-2, Math.min(2, irr));
}

/**
 * Sanitize text input for reports (actor, notes)
 */
export function sanitizeText(input: string, maxLength: number): string {
  if (!input) return '';
  
  // Remove control characters and HTML/XML tags
  const cleaned = input
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Control chars
    .replace(/<[^>]*>/g, '')              // HTML tags
    .replace(/[<>]/g, '');                // Remaining < >
  
  return cleaned.substring(0, maxLength).trim();
}

/**
 * Validate KPI data for completeness and ranges
 */
export function validateKpis(kpis: Partial<ReportKpis>): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for NaN/missing values
  const requiredFields = ['irr', 'tvpi', 'moic', 'dpi', 'rvpi', 'navUsd'] as const;
  for (const field of requiredFields) {
    const value = kpis[field];
    if (value === undefined || value === null || isNaN(value as number)) {
      warnings.push(`${field.toUpperCase()} data insufficient or missing`);
    }
  }

  // Validate flows
  if (!kpis.flows || isNaN(kpis.flows.in) || isNaN(kpis.flows.out)) {
    warnings.push('Flows data insufficient or missing');
  }

  // Business logic checks
  if (typeof kpis.tvpi === 'number' && kpis.tvpi < 0) {
    warnings.push('TVPI should not be negative');
  }
  
  if (typeof kpis.navUsd === 'number' && kpis.navUsd < 0) {
    warnings.push('NAV should not be negative');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Validate PoR data structure
 */
export function validatePor(por: Partial<ReportPor>): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!por.chains || por.chains.length === 0) {
    warnings.push('No PoR chain data available');
  } else {
    // Validate each chain
    por.chains.forEach((chain, idx) => {
      if (!chain.chain || chain.chain.length === 0) {
        errors.push(`Chain ${idx}: missing chain identifier`);
      }
      if (typeof chain.assetsUsd !== 'number' || isNaN(chain.assetsUsd)) {
        warnings.push(`Chain ${chain.chain}: assets value missing or invalid`);
      }
      if (typeof chain.addrCount !== 'number' || chain.addrCount < 0) {
        warnings.push(`Chain ${chain.chain}: address count invalid`);
      }
    });
  }

  if (typeof por.totalUsd !== 'number' || isNaN(por.totalUsd)) {
    warnings.push('Total PoR USD value missing or invalid');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Generate safe default KPIs when data is insufficient
 */
export function getDefaultKpis(): ReportKpis {
  return {
    irr: 0,
    tvpi: 1,
    moic: 1,
    dpi: 0,
    rvpi: 1,
    navUsd: 0,
    flows: {
      in: 0,
      out: 0
    },
    ts: new Date().toISOString()
  };
}

/**
 * Get validated and safe KPIs data
 */
export function getValidatedKpis(kpis: Partial<ReportKpis>): ReportKpis {
  const defaults = getDefaultKpis();
  
  return {
    irr: clampIrr(kpis.irr ?? defaults.irr),
    tvpi: (typeof kpis.tvpi === 'number' && !isNaN(kpis.tvpi)) ? Math.max(0, kpis.tvpi) : defaults.tvpi,
    moic: (typeof kpis.moic === 'number' && !isNaN(kpis.moic)) ? Math.max(0, kpis.moic) : defaults.moic,
    dpi: (typeof kpis.dpi === 'number' && !isNaN(kpis.dpi)) ? Math.max(0, kpis.dpi) : defaults.dpi,
    rvpi: (typeof kpis.rvpi === 'number' && !isNaN(kpis.rvpi)) ? Math.max(0, kpis.rvpi) : defaults.rvpi,
    navUsd: (typeof kpis.navUsd === 'number' && !isNaN(kpis.navUsd)) ? Math.max(0, kpis.navUsd) : defaults.navUsd,
    flows: {
      in: (typeof kpis.flows?.in === 'number' && !isNaN(kpis.flows.in)) ? Math.max(0, kpis.flows.in) : defaults.flows.in,
      out: (typeof kpis.flows?.out === 'number' && !isNaN(kpis.flows.out)) ? Math.max(0, kpis.flows.out) : defaults.flows.out
    },
    ts: kpis.ts || defaults.ts
  };
}

/**
 * Generate safe default PoR when data is insufficient
 */
export function getDefaultPor(): ReportPor {
  return {
    chains: [],
    totalUsd: 0,
    ts: new Date().toISOString()
  };
}

/**
 * Get validated and safe PoR data
 */
export function getValidatedPor(por: Partial<ReportPor>): ReportPor {
  const defaults = getDefaultPor();
  
  if (!por.chains || por.chains.length === 0) {
    return defaults;
  }
  
  // Validate and clean chains
  const validChains = por.chains
    .filter(chain => chain.chain && typeof chain.assetsUsd === 'number' && !isNaN(chain.assetsUsd))
    .map(chain => ({
      chain: chain.chain,
      custodian: chain.custodian || null,
      addrCount: Math.max(0, Math.floor(chain.addrCount || 0)),
      assetsUsd: Math.max(0, chain.assetsUsd)
    }));
  
  const totalUsd = validChains.reduce((sum, chain) => sum + chain.assetsUsd, 0);
  
  return {
    chains: validChains,
    totalUsd,
    ts: por.ts || defaults.ts
  };
}

/**
 * Format quarter string for reports (e.g., "2025Q3")
 */
export function formatQuarter(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}Q${quarter}`;
}

/**
 * Validate quarter string format
 */
export function isValidQuarter(quarter: string): boolean {
  return /^\d{4}Q[1-4]$/.test(quarter);
}