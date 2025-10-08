// ================================================================================================
// Módulo H — Data Provenance & Lineage Types
// ================================================================================================
// TypeScript definitions for end-to-end data traceability and lineage tracking
// Strict types without 'any' for signals, metrics, and reports provenance
// ================================================================================================

// =============================================================================
// Core Lineage Types
// =============================================================================

export interface LineageEvent {
  id: number;
  
  // Entity Classification
  entity: 'signal' | 'metric' | 'report';
  refId: string;                    // Logical ID across entity lifecycle
  
  // Processing Stage
  stage: 'ingest' | 'transform' | 'aggregate' | 'export';
  
  // Temporal Information
  ts: string;                       // ISO timestamp
  createdAt: string;                // ISO timestamp
  
  // Source & Process
  source: string;                   // Provider/process identifier
  
  // Data Payload (sanitized)
  inputs: Record<string, unknown>;  // Input parameters/data
  outputs: Record<string, unknown>; // Processed output
  
  // Integrity & Security
  hash: string;                     // SHA256 of logical content
  notes?: string;                   // Processing notes (max 500 chars)
}

export interface LineageTrace {
  refId: string;
  entity: 'signal' | 'metric' | 'report';
  events: LineageEvent[];
  
  // Computed Properties
  eventCount: number;
  firstEventAt: string;
  lastEventAt: string;
  stagesSequence: string[];
  sourcesSequence: string[];
  integrityValid: boolean;
}

// =============================================================================
// Stage-Specific Input/Output Types
// =============================================================================

// Ingest Stage
export interface IngestInputs {
  url?: string;
  method?: string;
  headers?: Record<string, string>; // Sanitized headers only
  provider?: string;
  timeout?: number;
}

export interface IngestOutputs {
  type: string;                     // Signal type: 'tvl', 'price', 'yield', etc.
  chain?: string;                   // Blockchain identifier
  value: number | string;           // Raw value
  timestamp: string;                // Data timestamp
  currency?: string;                // Value currency
  metadata?: Record<string, unknown>;
}

// Transform Stage
export interface TransformInputs {
  rawValue: unknown;
  rawTimestamp?: string;
  validationRules?: string[];
  normalizationConfig?: Record<string, unknown>;
}

export interface TransformOutputs {
  normalizedValue: unknown;
  confidenceScore?: number;         // 0.0 - 1.0
  validationResults?: string[];
  canonicalSchema: string;          // Schema version
  transformationApplied?: string[];
}

// Aggregate Stage
export interface AggregateInputs {
  metricKeys?: string[];            // Input metric identifiers
  window: string;                   // Time window: 'daily', 'monthly', 'quarterly'
  period: string;                   // Specific period: '2025Q3', '2025-09'
  aggregationMethod?: string;       // 'sum', 'average', 'weighted', etc.
  filters?: Record<string, unknown>;
}

export interface AggregateOutputs {
  // KPIs
  irr?: number;
  tvpi?: number;
  moic?: number;
  dpi?: number;
  rvpi?: number;
  navUsd?: number;
  flows?: {
    in: number;
    out: number;
  };
  
  // PoR
  totalAssetsUsd?: number;
  chains?: Array<{
    chain: string;
    assetsUsd: number;
    addrCount: number;
    custodian?: string;
  }>;
  
  // Metadata
  calculationMethod?: string;
  dataQualityScore?: number;
  lastUpdated?: string;
}

// Export Stage
export interface ExportInputs {
  kpisHash?: string;                // Hash of KPIs used
  porHash?: string;                 // Hash of PoR data used
  summaryHash?: string;             // Hash of summary data
  template: string;                 // Template identifier
  actor: string;                    // User/system generating export
  period?: string;                  // Report period
  recipients?: string[];            // Delivery targets (sanitized)
}

export interface ExportOutputs {
  file?: {
    path: string;
    sizeBytes: number;
    pages?: number;
    format?: string;
  };
  generationTimeMs?: number;
  deliveryStatus?: {
    attempted: number;
    successful: number;
    failed: number;
  };
  qualityChecks?: string[];
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface LineageTraceQuery {
  entity: 'signal' | 'metric' | 'report';
  refId: string;
  stage?: 'ingest' | 'transform' | 'aggregate' | 'export';
  limit?: number;
  offset?: number;
}

export interface LineageBySignalQuery {
  id: string;                       // Signal ID
  includeDownstream?: boolean;      // Include metrics/reports derived from this signal
}

export interface LineageSearchQuery {
  q: string;                        // Search term for provider/hash/source
  entity?: 'signal' | 'metric' | 'report';
  stage?: 'ingest' | 'transform' | 'aggregate' | 'export';
  source?: string;                  // Filter by source
  dateFrom?: string;                // ISO date
  dateTo?: string;                  // ISO date
  limit?: number;                   // Default 100
  offset?: number;
}

export interface LineageTraceResponse {
  trace: LineageTrace;
  success: boolean;
  error?: string;
}

export interface LineageSearchResponse {
  items: LineageEvent[];
  total: number;
  hasMore: boolean;
  success: boolean;
  error?: string;
}

// =============================================================================
// Lineage Creation & Utility Types
// =============================================================================

export interface CreateLineageEventRequest {
  entity: 'signal' | 'metric' | 'report';
  refId: string;
  stage: 'ingest' | 'transform' | 'aggregate' | 'export';
  source: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  notes?: string;
}

export interface LineageHashContext {
  outputs: Record<string, unknown>;
  stage: string;
  source: string;
}

// =============================================================================
// UI Component Types
// =============================================================================

export interface LineageDrawerProps {
  entity: 'signal' | 'metric' | 'report';
  refId: string;
  isOpen: boolean;
  onClose: () => void;
}

export interface LineageTimelineItemProps {
  event: LineageEvent;
  isFirst?: boolean;
  isLast?: boolean;
  onCopyHash?: (hash: string) => void;
  onCopyEvent?: (event: LineageEvent) => void;
}

export interface LineageStageChipProps {
  stage: 'ingest' | 'transform' | 'aggregate' | 'export';
  isActive?: boolean;
  isCompleted?: boolean;
  onClick?: () => void;
}

// =============================================================================
// Metrics & Monitoring Types
// =============================================================================

export interface LineageMetrics {
  totalEvents: number;
  eventsByStage: Record<string, number>;
  eventsByEntity: Record<string, number>;
  eventsBySource: Record<string, number>;
  integrityFailures: number;
  averageProcessingTime: Record<string, number>; // By stage
}

export interface LineageHealth {
  status: 'healthy' | 'warning' | 'critical';
  recentEvents: number;
  integrityScore: number;           // Percentage of events with valid hashes
  missingStages: string[];          // Stages with no recent events
  issues: string[];
  recommendations: string[];
}

// =============================================================================
// Error Types
// =============================================================================

export class LineageError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_ENTITY' | 'MISSING_STAGE' | 'HASH_MISMATCH' | 'SERIALIZATION_ERROR' | 'DATABASE_ERROR',
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LineageError';
  }
}

export class LineageValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
    public constraints: string[]
  ) {
    super(message);
    this.name = 'LineageValidationError';
  }
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface LineageConfig {
  enabled: boolean;
  maxInputSizeKb: number;           // Limit input/output size
  maxOutputSizeKb: number;
  retentionDays: number;            // Auto-cleanup old events
  sanitizeInputs: boolean;          // Remove sensitive data
  sanitizeOutputs: boolean;
  hashAlgorithm: 'sha256' | 'sha512';
  compressionEnabled: boolean;      // Compress large payloads
}

// =============================================================================
// Function Type Definitions
// =============================================================================

export type LineageHashFunction = (context: LineageHashContext) => string;
export type LineageSanitizer = (data: Record<string, unknown>) => Record<string, unknown>;
export type LineageValidator = (event: Partial<LineageEvent>) => boolean;

// =============================================================================
// Constants and Enums
// =============================================================================

export const LINEAGE_ENTITIES = ['signal', 'metric', 'report'] as const;
export const LINEAGE_STAGES = ['ingest', 'transform', 'aggregate', 'export'] as const;

export const LINEAGE_STAGE_COLORS = {
  ingest: '#3B82F6',      // Blue
  transform: '#8B5CF6',   // Purple
  aggregate: '#F59E0B',   // Orange
  export: '#10B981'       // Green
} as const;

export const LINEAGE_STAGE_DESCRIPTIONS = {
  ingest: 'Raw data collection from external sources',
  transform: 'Data normalization and validation',
  aggregate: 'Metric calculation and KPI aggregation', 
  export: 'Report generation and delivery'
} as const;

// =============================================================================
// Type Guards and Validators
// =============================================================================

export function isValidLineageEntity(entity: unknown): entity is 'signal' | 'metric' | 'report' {
  return typeof entity === 'string' && ['signal', 'metric', 'report'].includes(entity);
}

export function isValidLineageStage(stage: unknown): stage is 'ingest' | 'transform' | 'aggregate' | 'export' {
  return typeof stage === 'string' && ['ingest', 'transform', 'aggregate', 'export'].includes(stage);
}

export function isValidSHA256Hash(hash: unknown): hash is string {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash);
}

// =============================================================================
// Utility Types for Strict JSON Handling
// =============================================================================

export type SerializableValue = 
  | string 
  | number 
  | boolean 
  | null 
  | SerializableArray 
  | SerializableObject;

export interface SerializableArray extends Array<SerializableValue> {}

export interface SerializableObject {
  [key: string]: SerializableValue;
}