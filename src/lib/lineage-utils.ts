import * as crypto from 'crypto';
import { 
  LineageEvent, 
  CreateLineageEventRequest,
  LineageHashContext,
  LineageError,
  LineageConfig,
  SerializableObject,
  isValidLineageEntity,
  isValidLineageStage,
  isValidSHA256Hash
} from '@/types/lineage';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_LINEAGE_CONFIG: LineageConfig = {
  enabled: process.env.NODE_ENV === 'production' || process.env.LINEAGE_ENABLED === 'true',
  maxInputSizeKb: 64,
  maxOutputSizeKb: 64,
  retentionDays: 365,
  sanitizeInputs: true,
  sanitizeOutputs: true,
  hashAlgorithm: 'sha256',
  compressionEnabled: false
};

// Sensitive field patterns to sanitize
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /credential/i,
  /authorization/i,
  /auth/i,
  /api[_-]?key/i,
  /private/i,
  /confidential/i
];

// =============================================================================
// Hash Calculation
// =============================================================================

/**
 * Calculate SHA256 hash for lineage event integrity
 * Formula: sha256(JSON.stringify(outputs) + '|' + stage + '|' + source)
 */
export function calculateLineageHash(context: LineageHashContext): string {
  try {
    // Ensure deterministic JSON serialization
    const outputsString = JSON.stringify(context.outputs, Object.keys(context.outputs).sort());
    const hashInput = `${outputsString}|${context.stage}|${context.source}`;
    
    return crypto
      .createHash('sha256')
      .update(hashInput, 'utf8')
      .digest('hex');
      
  } catch (error) {
    throw new LineageError(
      'Failed to calculate lineage hash',
      'HASH_MISMATCH',
      { context, error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Verify lineage event hash integrity
 */
export function verifyLineageHash(event: LineageEvent): boolean {
  if (!isValidSHA256Hash(event.hash)) {
    return false;
  }
  
  try {
    const expectedHash = calculateLineageHash({
      outputs: event.outputs,
      stage: event.stage,
      source: event.source
    });
    
    return event.hash === expectedHash;
  } catch {
    return false;
  }
}

// =============================================================================
// Data Sanitization
// =============================================================================

/**
 * Sanitize sensitive data from inputs/outputs
 */
export function sanitizeLineageData(
  data: Record<string, unknown>,
  config = DEFAULT_LINEAGE_CONFIG
): SerializableObject {
  if (!config.sanitizeInputs && !config.sanitizeOutputs) {
    return data as SerializableObject;
  }
  
  const sanitized: SerializableObject = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Check if key matches sensitive patterns
    const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Recursively sanitize objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeLineageData(
        value as Record<string, unknown>,
        config
      );
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (item && typeof item === 'object') {
          return sanitizeLineageData(item as Record<string, unknown>, config);
        }
        return item;
      });
    }
    // Primitive values
    else {
      sanitized[key] = value as string | number | boolean | null;
    }
  }
  
  return sanitized;
}

/**
 * Truncate large data objects to prevent storage bloat
 */
export function truncateLineageData(
  data: Record<string, unknown>,
  maxSizeKb: number
): SerializableObject {
  const serialized = JSON.stringify(data);
  const sizeKb = Buffer.byteLength(serialized, 'utf8') / 1024;
  
  if (sizeKb <= maxSizeKb) {
    return data as SerializableObject;
  }
  
  // Create truncated summary
  const sampleEntries = Object.entries(data).slice(0, 3).map(([key, value]) => [
    key,
    typeof value === 'string' && value.length > 100 
      ? value.substring(0, 100) + '...'
      : value
  ]);
  
  return {
    _truncated: true,
    _originalSizeKb: Math.round(sizeKb * 100) / 100,
    _maxSizeKb: maxSizeKb,
    _summary: `Data truncated (${Object.keys(data).length} fields)`,
    _keys: Object.keys(data).slice(0, 10), // First 10 keys for reference
    _sampleData: Object.fromEntries(sampleEntries) as SerializableObject
  };
}

// =============================================================================
// Event Validation
// =============================================================================

/**
 * Validate lineage event before creation
 */
export function validateLineageEvent(event: Partial<LineageEvent>): void {
  const errors: string[] = [];
  
  // Required fields
  if (!event.entity) {
    errors.push('entity is required');
  } else if (!isValidLineageEntity(event.entity)) {
    errors.push('entity must be signal, metric, or report');
  }
  
  if (!event.refId || typeof event.refId !== 'string') {
    errors.push('refId is required and must be a string');
  }
  
  if (!event.stage) {
    errors.push('stage is required');
  } else if (!isValidLineageStage(event.stage)) {
    errors.push('stage must be ingest, transform, aggregate, or export');
  }
  
  if (!event.source || typeof event.source !== 'string') {
    errors.push('source is required and must be a string');
  }
  
  if (!event.outputs || typeof event.outputs !== 'object') {
    errors.push('outputs is required and must be an object');
  }
  
  // Optional validations
  if (event.notes && typeof event.notes === 'string' && event.notes.length > 500) {
    errors.push('notes must be 500 characters or less');
  }
  
  if (event.hash && !isValidSHA256Hash(event.hash)) {
    errors.push('hash must be a valid SHA256 hex string');
  }
  
  if (errors.length > 0) {
    throw new LineageError(
      `Lineage event validation failed: ${errors.join(', ')}`,
      'INVALID_ENTITY',
      { errors, event }
    );
  }
}

// =============================================================================
// Event Creation Helpers
// =============================================================================

/**
 * Create a complete lineage event with proper sanitization and hashing
 */
export function createLineageEvent(
  request: CreateLineageEventRequest,
  config = DEFAULT_LINEAGE_CONFIG
): Omit<LineageEvent, 'id' | 'ts' | 'createdAt'> {
  // Validate request
  validateLineageEvent(request);
  
  if (!config.enabled) {
    throw new LineageError(
      'Lineage tracking is disabled',
      'DATABASE_ERROR',
      { config }
    );
  }
  
  // Sanitize data
  const sanitizedInputs = sanitizeLineageData(request.inputs, config);
  const sanitizedOutputs = sanitizeLineageData(request.outputs, config);
  
  // Truncate if necessary
  const truncatedInputs = truncateLineageData(sanitizedInputs, config.maxInputSizeKb);
  const truncatedOutputs = truncateLineageData(sanitizedOutputs, config.maxOutputSizeKb);
  
  // Calculate hash
  const hash = calculateLineageHash({
    outputs: truncatedOutputs,
    stage: request.stage,
    source: request.source
  });
  
  return {
    entity: request.entity,
    refId: request.refId,
    stage: request.stage,
    source: request.source,
    inputs: truncatedInputs,
    outputs: truncatedOutputs,
    hash,
    notes: request.notes
  };
}

// =============================================================================
// Specialized Event Creators
// =============================================================================

/**
 * Create ingest lineage event for signal data collection
 */
export function createIngestEvent(
  signalId: string,
  source: string,
  inputs: { url?: string; method?: string; headers?: Record<string, string> },
  outputs: { type: string; value: unknown; timestamp: string; [key: string]: unknown },
  notes?: string
): Omit<LineageEvent, 'id' | 'ts' | 'createdAt'> {
  return createLineageEvent({
    entity: 'signal',
    refId: signalId,
    stage: 'ingest',
    source,
    inputs,
    outputs,
    notes
  });
}

/**
 * Create transform lineage event for data normalization
 */
export function createTransformEvent(
  signalId: string,
  source: string,
  inputs: { rawValue: unknown; validationRules?: string[] },
  outputs: { normalizedValue: unknown; confidenceScore?: number; canonicalSchema: string },
  notes?: string
): Omit<LineageEvent, 'id' | 'ts' | 'createdAt'> {
  return createLineageEvent({
    entity: 'signal',
    refId: signalId,
    stage: 'transform',
    source,
    inputs,
    outputs,
    notes
  });
}

/**
 * Create aggregate lineage event for metric calculation
 */
export function createAggregateEvent(
  metricId: string,
  source: string,
  inputs: { metricKeys: string[]; window: string; period: string },
  outputs: Record<string, unknown>,
  notes?: string
): Omit<LineageEvent, 'id' | 'ts' | 'createdAt'> {
  return createLineageEvent({
    entity: 'metric',
    refId: metricId,
    stage: 'aggregate',
    source,
    inputs,
    outputs,
    notes
  });
}

/**
 * Create export lineage event for report generation
 */
export function createExportEvent(
  reportId: string,
  source: string,
  inputs: { kpisHash?: string; porHash?: string; template: string; actor: string },
  outputs: { file?: { path: string; sizeBytes: number } },
  notes?: string
): Omit<LineageEvent, 'id' | 'ts' | 'createdAt'> {
  return createLineageEvent({
    entity: 'report',
    refId: reportId,
    stage: 'export',
    source,
    inputs,
    outputs,
    notes
  });
}

// =============================================================================
// Lineage Chain Analysis
// =============================================================================

/**
 * Analyze lineage chain completeness and detect missing stages
 */
export function analyzeLineageChain(events: LineageEvent[]): {
  isComplete: boolean;
  missingStages: string[];
  duplicateStages: string[];
  integrityValid: boolean;
  timeline: Array<{ stage: string; timestamp: string; source: string }>;
} {
  const stages = events.map(e => e.stage);
  const uniqueStages = [...new Set(stages)];
  
  // Check for missing stages (depends on entity type)
  const entity = events[0]?.entity;
  let requiredStages: Array<'ingest' | 'transform' | 'aggregate' | 'export'> = [];
  
  switch (entity) {
    case 'signal':
      requiredStages = ['ingest']; // Transform is optional
      break;
    case 'metric':
      requiredStages = ['aggregate'];
      break;
    case 'report':
      requiredStages = ['export'];
      break;
  }
  
  const missingStages = requiredStages.filter(stage => !uniqueStages.includes(stage));
  const duplicateStages = stages.filter((stage, index) => stages.indexOf(stage) !== index);
  
  // Verify integrity
  const integrityValid = events.every(event => verifyLineageHash(event));
  
  // Create timeline
  const timeline = events
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .map(event => ({
      stage: event.stage,
      timestamp: event.ts,
      source: event.source
    }));
  
  return {
    isComplete: missingStages.length === 0,
    missingStages,
    duplicateStages,
    integrityValid,
    timeline
  };
}

// =============================================================================
// Performance Utilities
// =============================================================================

/**
 * Calculate processing time between stages
 */
export function calculateProcessingTimes(events: LineageEvent[]): Record<string, number> {
  const sortedEvents = events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  const processingTimes: Record<string, number> = {};
  
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    const timeDiff = new Date(currentEvent.ts).getTime() - new Date(prevEvent.ts).getTime();
    
    const transitionKey = `${prevEvent.stage}_to_${currentEvent.stage}`;
    processingTimes[transitionKey] = timeDiff;
  }
  
  return processingTimes;
}

/**
 * Get lineage configuration with environment overrides
 */
export function getLineageConfig(): LineageConfig {
  return {
    ...DEFAULT_LINEAGE_CONFIG,
    enabled: process.env.LINEAGE_ENABLED === 'true' || DEFAULT_LINEAGE_CONFIG.enabled,
    maxInputSizeKb: parseInt(process.env.LINEAGE_MAX_INPUT_SIZE_KB || '64'),
    maxOutputSizeKb: parseInt(process.env.LINEAGE_MAX_OUTPUT_SIZE_KB || '64'),
    retentionDays: parseInt(process.env.LINEAGE_RETENTION_DAYS || '365'),
    sanitizeInputs: process.env.LINEAGE_SANITIZE_INPUTS !== 'false',
    sanitizeOutputs: process.env.LINEAGE_SANITIZE_OUTPUTS !== 'false'
  };
}