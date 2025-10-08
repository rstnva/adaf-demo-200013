import { 
  DqpRow, 
  DqpStatus, 
  DqpStatusCalculation, 
  DqpThresholds, 
  DEFAULT_DQP_THRESHOLDS,
  SchemaRequirement,
  IncidentKind
} from '@/types/dqp';
import { PrismaClient } from '@prisma/client';

/**
 * DQP Core Calculation Engine
 * Handles freshness, completeness, duplicates, and schema validation
 */

const prisma = new PrismaClient();

// Schema validation requirements by signal type
export const SCHEMA_REQUIREMENTS: SchemaRequirement[] = [
  {
    type: 'onchain.tvl.point',
    required: ['chain', 'value'],
    validator: (metadata) => {
      const errors: string[] = [];
      if (!metadata.chain || typeof metadata.chain !== 'string') {
        errors.push('metadata.chain must be non-empty string');
      }
      if (!metadata.value || typeof metadata.value !== 'number' || metadata.value <= 0) {
        errors.push('metadata.value must be positive number');
      }
      return { valid: errors.length === 0, errors };
    }
  },
  {
    type: 'derivs.funding.point',
    required: ['asset', 'exchange', 'rate'],
    validator: (metadata) => {
      const errors: string[] = [];
      if (!metadata.asset || !['BTC', 'ETH'].includes(metadata.asset as string)) {
        errors.push('metadata.asset must be BTC or ETH');
      }
      if (!metadata.exchange || typeof metadata.exchange !== 'string') {
        errors.push('metadata.exchange must be non-empty string');
      }
      if (typeof metadata.rate !== 'number') {
        errors.push('metadata.rate must be number');
      }
      return { valid: errors.length === 0, errors };
    }
  },
  {
    type: 'offchain.etf.flow',
    required: ['asset', 'netInUsd'],
    validator: (metadata) => {
      const errors: string[] = [];
      if (!metadata.asset || typeof metadata.asset !== 'string') {
        errors.push('metadata.asset must be non-empty string');
      }
      if (typeof metadata.netInUsd !== 'number') {
        errors.push('metadata.netInUsd must be number');
      }
      return { valid: errors.length === 0, errors };
    }
  },
  {
    type: 'news.headline',
    required: ['title', 'url'],
    validator: (metadata) => {
      const errors: string[] = [];
      if (!metadata.title || typeof metadata.title !== 'string') {
        errors.push('metadata.title must be non-empty string');
      }
      if (!metadata.url || typeof metadata.url !== 'string') {
        errors.push('metadata.url must be non-empty string');
      }
      return { valid: errors.length === 0, errors };
    }
  }
];

/**
 * Get DQP thresholds from limits table or use defaults
 */
export async function getDqpThresholds(): Promise<DqpThresholds> {
  try {
    const limits = await prisma.limit.findMany({
      where: {
        key: {
          in: [
            'dqp.freshness.ok', 'dqp.freshness.warn', 'dqp.freshness.fail',
            'dqp.duplicates.warn', 'dqp.duplicates.fail',
            'dqp.schema.warn', 'dqp.schema.fail'
          ]
        }
      }
    });

    const limitMap = limits.reduce((acc, limit) => {
      acc[limit.key] = limit.value;
      return acc;
    }, {} as Record<string, number>);

    return {
      freshness: {
        ok: limitMap['dqp.freshness.ok'] || DEFAULT_DQP_THRESHOLDS.freshness.ok,
        warn: limitMap['dqp.freshness.warn'] || DEFAULT_DQP_THRESHOLDS.freshness.warn,
        fail: limitMap['dqp.freshness.fail'] || DEFAULT_DQP_THRESHOLDS.freshness.fail
      },
      duplicates: {
        warn: limitMap['dqp.duplicates.warn'] || DEFAULT_DQP_THRESHOLDS.duplicates.warn,
        fail: limitMap['dqp.duplicates.fail'] || DEFAULT_DQP_THRESHOLDS.duplicates.fail
      },
      schema: {
        warn: limitMap['dqp.schema.warn'] || DEFAULT_DQP_THRESHOLDS.schema.warn,
        fail: limitMap['dqp.schema.fail'] || DEFAULT_DQP_THRESHOLDS.schema.fail
      }
    };
  } catch (error) {
    console.warn('Failed to load DQP thresholds from database, using defaults:', error);
    return DEFAULT_DQP_THRESHOLDS;
  }
}

/**
 * Calculate freshness in minutes from last signal timestamp
 */
export function calculateFreshness(lastTs: string | null): number | null {
  if (!lastTs) return null;
  
  const now = new Date();
  const lastDate = new Date(lastTs);
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60)); // minutes
}

/**
 * Determine status based on freshness, duplicates, and schema errors
 */
export function calculateDqpStatus(
  freshnessMin: number | null,
  dupes24h: number,
  schemaErrors24h: number,
  thresholds: DqpThresholds
): DqpStatusCalculation {
  const reasons: string[] = [];
  let status: DqpStatus = 'ok';

  // Freshness check
  if (freshnessMin !== null) {
    if (freshnessMin >= thresholds.freshness.fail) {
      status = 'fail';
      reasons.push(`No data ${freshnessMin}m`);
    } else if (freshnessMin >= thresholds.freshness.warn) {
      status = 'warn';
      reasons.push(`Stale ${freshnessMin}m`);
    }
  }

  // Duplicates check
  if (dupes24h > thresholds.duplicates.fail) {
    status = 'fail';
    reasons.push(`Dupes ${dupes24h}`);
  } else if (dupes24h > thresholds.duplicates.warn) {
    if (status !== 'fail') status = 'warn';
    reasons.push(`Dupes ${dupes24h}`);
  }

  // Schema errors check
  if (schemaErrors24h > thresholds.schema.fail) {
    status = 'fail';
    reasons.push(`Schema ${schemaErrors24h}`);
  } else if (schemaErrors24h > thresholds.schema.warn) {
    if (status !== 'fail') status = 'warn';
    reasons.push(`Schema ${schemaErrors24h}`);
  }

  return { status, reasons };
}

/**
 * Get DQP overview data with complex SQL aggregation
 */
export async function getDqpOverview(filters: {
  status?: string;
  agent?: string;
  source?: string;
  type?: string;
  limit?: number;
}): Promise<DqpRow[]> {
  const { status, agent, source, type, limit = 500 } = filters;
  
  // Build WHERE conditions
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (source && source !== 'any') {
    conditions.push(`s.source = $${paramIndex}`);
    params.push(source);
    paramIndex++;
  }

  if (type && type !== 'any') {
    conditions.push(`s.type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  if (agent && agent !== 'any') {
    // Extract agent prefix from agentCode (e.g., 'NM-1' -> 'NM')
    conditions.push(`LEFT(r.agent_code, 2) = $${paramIndex}`);
    params.push(agent);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    WITH signal_stats AS (
      SELECT 
        s.source,
        COALESCE(r.agent_code, 'UNKNOWN') as agent_code,
        s.type,
        MAX(s.timestamp) as last_ts,
        COUNT(*) FILTER (WHERE s.timestamp > NOW() - INTERVAL '24 hours') as count_24h,
        COUNT(*) FILTER (WHERE dup.fingerprint IS NOT NULL) as dupes_24h,
        COUNT(*) FILTER (WHERE se.signal_id IS NOT NULL) as schema_errors_24h
      FROM signals s
      LEFT JOIN rules r ON r.agent_code ~ '^[A-Z]{2}-[0-9X]+$'  -- Match agent pattern
      LEFT JOIN (
        SELECT fingerprint 
        FROM signals 
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY fingerprint 
        HAVING COUNT(*) > 1
      ) dup ON s.fingerprint = dup.fingerprint AND s.timestamp > NOW() - INTERVAL '24 hours'
      LEFT JOIN (
        SELECT DISTINCT cl.entity_id as signal_id
        FROM change_logs cl
        WHERE cl.entity = 'DQP' 
          AND cl.field = 'schema_error'
          AND cl.at > NOW() - INTERVAL '24 hours'
      ) se ON s.id = se.signal_id
      WHERE s.timestamp > NOW() - INTERVAL '3 days'  -- Limit lookback window
      ${whereClause}
      GROUP BY s.source, r.agent_code, s.type
    )
    SELECT 
      source,
      agent_code,
      type,
      last_ts,
      count_24h,
      dupes_24h,
      schema_errors_24h
    FROM signal_stats
    ORDER BY 
      CASE 
        WHEN last_ts IS NULL THEN 1
        WHEN last_ts < NOW() - INTERVAL '1 hour' THEN 2
        WHEN last_ts < NOW() - INTERVAL '15 minutes' THEN 3
        ELSE 4
      END,
      source, agent_code, type
    LIMIT $${paramIndex}
  `;

  params.push(limit);

  const rawResult = await prisma.$queryRawUnsafe(query, ...params) as Array<{
    source: string;
    agent_code: string;
    type: string;
    last_ts: Date | null;
    count_24h: bigint;
    dupes_24h: bigint;
    schema_errors_24h: bigint;
  }>;

  const thresholds = await getDqpThresholds();

  const rows: DqpRow[] = rawResult.map(row => {
    const lastTs = row.last_ts ? row.last_ts.toISOString() : null;
    const freshnessMin = calculateFreshness(lastTs);
    const dupes24h = Number(row.dupes_24h);
    const schemaErrors24h = Number(row.schema_errors_24h);
    
    const statusCalc = calculateDqpStatus(freshnessMin, dupes24h, schemaErrors24h, thresholds);
    
    return {
      source: row.source,
      agentCode: row.agent_code,
      type: row.type,
      lastTs,
      freshnessMin,
      lastCount24h: Number(row.count_24h),
      dupes24h,
      schemaErrors24h,
      status: statusCalc.status,
      notes: statusCalc.reasons.length > 0 ? statusCalc.reasons.join(', ') : undefined
    };
  });

  // Apply status filter if specified
  if (status && status !== 'any') {
    return rows.filter(row => row.status === status);
  }

  return rows;
}

/**
 * Validate signal schema and return validation result
 */
export function validateSignalSchema(type: string, metadata: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const requirement = SCHEMA_REQUIREMENTS.find(req => req.type === type);
  
  if (!requirement) {
    // No specific requirements for this type
    return { valid: true, errors: [] };
  }

  // Check required fields
  const errors: string[] = [];
  for (const field of requirement.required) {
    if (!metadata[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Run custom validator if provided
  if (requirement.validator && errors.length === 0) {
    const validationResult = requirement.validator(metadata);
    if (!validationResult.valid) {
      errors.push(...validationResult.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create DQP incident record
 */
export async function createDqpIncident(
  source: string,
  agentCode: string,
  type: string,
  kind: IncidentKind,
  message: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    // Use change_logs table for incident storage
    await prisma.changeLog.create({
      data: {
        actor: 'SYSTEM',
        entity: 'DQP',
        entityId: `${source}:${agentCode}:${type}`,
        field: kind,
        old: {},
        new: JSON.stringify({
          source,
          agentCode,
          type,
          kind,
          message,
          payload: payload || {},
          acknowledged: false
        })
      }
    });
  } catch (error) {
    console.error('Failed to create DQP incident:', error);
    throw error;
  }
}