import { DqpIncident } from '@/types/dqp';
import { PrismaClient } from '@prisma/client';

/**
 * DQP Incidents Management
 * Handles incident retrieval, acknowledgment, and audit trail
 */

const prisma = new PrismaClient();

/**
 * Get DQP incidents with filtering
 */
export async function getDqpIncidents(filters: {
  kind?: string;
  source?: string;
  agentCode?: string;
  ack?: string;
  limit?: number;
}): Promise<DqpIncident[]> {
  const { kind, source, agentCode, ack, limit = 200 } = filters;
  
  // Build WHERE conditions
  const conditions: string[] = ['cl.entity = $1'];
  const params: unknown[] = ['DQP'];
  let paramIndex = 2;

  if (kind && kind !== 'any') {
    conditions.push(`cl.field = $${paramIndex}`);
    params.push(kind);
    paramIndex++;
  }

  if (source && source !== 'any') {
    conditions.push(`cl.new::text LIKE $${paramIndex}`);
    params.push(`%"source":"${source}"%`);
    paramIndex++;
  }

  if (agentCode && agentCode !== 'any') {
    conditions.push(`cl.new::text LIKE $${paramIndex}`);
    params.push(`%"agentCode":"${agentCode}"%`);
    paramIndex++;
  }

  if (ack && ack !== 'any') {
    const ackValue = ack === '1' ? 'true' : 'false';
    conditions.push(`cl.new::text LIKE $${paramIndex}`);
    params.push(`%"acknowledged":${ackValue}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT 
      cl.id,
      cl.at,
      cl.new
    FROM change_logs cl
    WHERE ${whereClause}
    ORDER BY cl.at DESC
    LIMIT $${paramIndex}
  `;

  params.push(limit);

  const rawResult = await prisma.$queryRawUnsafe(query, ...params) as Array<{
    id: string;
    at: Date;
    new: string;
  }>;

  const incidents: DqpIncident[] = rawResult.map(row => {
    try {
      const data = JSON.parse(row.new) as {
        source: string;
        agentCode: string;
        type: string;
        kind: 'freshness' | 'duplicate' | 'schema' | 'backfill' | 'rate_limit' | 'provider_down';
        message: string;
        payload?: Record<string, unknown>;
        acknowledged: boolean;
      };

      return {
        id: row.id,
        ts: row.at.toISOString(),
        source: data.source,
        agentCode: data.agentCode,
        type: data.type,
        kind: data.kind,
        message: data.message,
        payload: data.payload,
        acknowledged: data.acknowledged
      };
    } catch (error) {
      console.error('Failed to parse incident data:', error, row.new);
      // Return a fallback incident
      return {
        id: row.id,
        ts: row.at.toISOString(),
        source: 'unknown',
        agentCode: 'unknown',
        type: 'unknown',
        kind: 'schema',
        message: 'Failed to parse incident data',
        acknowledged: false
      };
    }
  });

  return incidents;
}

/**
 * Acknowledge a DQP incident
 */
export async function acknowledgeDqpIncident(
  id: string | number,
  actor: string
): Promise<void> {
  try {
    // Get the current incident data
    const incident = await prisma.changeLog.findUnique({
      where: { id: String(id) }
    });

    if (!incident) {
      throw new Error(`Incident ${id} not found`);
    }

    // Parse and update the acknowledged status
    const incidentData = JSON.parse(incident.new as string);
    incidentData.acknowledged = true;

    // Update the incident record
    await prisma.changeLog.update({
      where: { id: String(id) },
      data: {
        new: JSON.stringify(incidentData)
      }
    });

    // Create audit trail
    await prisma.changeLog.create({
      data: {
        actor: actor.slice(0, 120), // Sanitize actor length
        entity: 'DQP',
        entityId: String(id),
        field: 'ACK_INCIDENT',
        old: JSON.stringify({ acknowledged: false }),
        new: JSON.stringify({ acknowledged: true, ackedBy: actor, ackedAt: new Date().toISOString() })
      }
    });
  } catch (error) {
    console.error('Failed to acknowledge DQP incident:', error);
    throw error;
  }
}

/**
 * Create retry request (audit only - no actual backend queuing yet)
 */
export async function createRetryRequest(
  source: string,
  agentCode: string,
  type: string | undefined,
  actor: string
): Promise<{ ok: boolean; queued: boolean }> {
  try {
    // Create audit trail for retry request
    await prisma.changeLog.create({
      data: {
        actor: actor.slice(0, 120), // Sanitize actor length
        entity: 'DQP',
        entityId: `${source}:${agentCode}:${type || 'all'}`,
        field: 'RETRY_REQUESTED',
        old: JSON.stringify({}),
        new: JSON.stringify({
          source,
          agentCode,
          type: type || 'all',
          requestedBy: actor,
          requestedAt: new Date().toISOString()
        })
      }
    });

    // Return queued=false since no actual backend queuing implemented yet
    return { ok: true, queued: false };
  } catch (error) {
    console.error('Failed to create retry request:', error);
    throw error;
  }
}