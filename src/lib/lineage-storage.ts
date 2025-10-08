// Lineage storage service for data provenance tracking
import { 
  LineageEvent, 
  LineageTrace,
  CreateLineageEventRequest,
  LineageTraceQuery,
  LineageSearchQuery,
  LineageError
} from '@/types/lineage';
import { 
  createLineageEvent,
  verifyLineageHash,
  analyzeLineageChain,
  getLineageConfig
} from './lineage-utils';
import { incLineageEvent } from './metrics';

// =============================================================================
// Database Lineage Storage Service
// =============================================================================

/**
 * Store lineage event in database with integrity verification
 */
export async function recordLineageEvent(
  request: CreateLineageEventRequest
): Promise<LineageEvent> {
  try {
    const config = getLineageConfig();
    
    if (!config.enabled) {
      console.log('[Lineage] Tracking disabled, skipping event recording');
      // Return mock event for development
      return {
        id: Date.now(),
        ts: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...createLineageEvent(request, config)
      };
    }
    
    // Create sanitized and validated event
    const eventData = createLineageEvent(request, config);
    
    // In production, this would insert into PostgreSQL database
    // For now, we'll create a mock implementation
    const lineageEvent: LineageEvent = {
      id: Date.now(), // In production: use database sequence
      ts: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...eventData
    };
    
    console.log(`[Lineage] Recorded ${eventData.entity} event:`, {
      refId: eventData.refId,
      stage: eventData.stage,
      source: eventData.source,
      hash: eventData.hash.substring(0, 8) + '...'
    });

    // Record metrics for lineage event
    incLineageEvent(eventData.stage, eventData.entity, eventData.source);
    
    // Verify integrity after storage
    if (!verifyLineageHash(lineageEvent)) {
      throw new LineageError(
        'Hash verification failed after storage',
        'HASH_MISMATCH',
        { eventId: lineageEvent.id, refId: request.refId }
      );
    }
    
    // TODO: In production implementation:
    // const query = `
    //   INSERT INTO lineage_events (entity, ref_id, stage, source, inputs, outputs, hash, notes)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    //   RETURNING *
    // `;
    // const result = await db.query(query, [
    //   eventData.entity, eventData.refId, eventData.stage, eventData.source,
    //   JSON.stringify(eventData.inputs), JSON.stringify(eventData.outputs),
    //   eventData.hash, eventData.notes
    // ]);
    
    return lineageEvent;
    
  } catch (error) {
    console.error('[Lineage] Failed to record event:', error);
    throw error instanceof LineageError ? error : new LineageError(
      'Failed to store lineage event',
      'DATABASE_ERROR',
      { request, error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Retrieve complete lineage trace for an entity
 */
export async function getLineageTrace(query: LineageTraceQuery): Promise<LineageTrace> {
  try {
    // Mock implementation - in production, query PostgreSQL database
    const mockEvents: LineageEvent[] = await getMockLineageEvents(query.entity, query.refId);
    
    // Sort events chronologically
    const sortedEvents = mockEvents.sort((a, b) => 
      new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );
    
    // Apply pagination if specified
    const startIndex = query.offset || 0;
    const endIndex = query.limit ? startIndex + query.limit : sortedEvents.length;
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex);
    
    // Analyze chain completeness
    const chainAnalysis = analyzeLineageChain(paginatedEvents);
    
    const trace: LineageTrace = {
      refId: query.refId,
      entity: query.entity,
      events: paginatedEvents,
      eventCount: paginatedEvents.length,
      firstEventAt: paginatedEvents[0]?.ts || '',
      lastEventAt: paginatedEvents[paginatedEvents.length - 1]?.ts || '',
      stagesSequence: chainAnalysis.timeline.map(t => t.stage),
      sourcesSequence: chainAnalysis.timeline.map(t => t.source),
      integrityValid: chainAnalysis.integrityValid
    };
    
    console.log(`[Lineage] Retrieved trace for ${query.entity}:${query.refId}:`, {
      eventCount: trace.eventCount,
      stagesSequence: trace.stagesSequence,
      integrityValid: trace.integrityValid
    });
    
    return trace;
    
  } catch (error) {
    console.error('[Lineage] Failed to retrieve trace:', error);
    throw new LineageError(
      'Failed to retrieve lineage trace',
      'DATABASE_ERROR',
      { query, error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Search lineage events by various criteria
 */
export async function searchLineageEvents(query: LineageSearchQuery): Promise<{
  items: LineageEvent[];
  total: number;
  hasMore: boolean;
}> {
  try {
    // Mock implementation - in production, use PostgreSQL full-text search
    const allMockEvents = await getAllMockLineageEvents();
    
    // Apply filters
    let filteredEvents = allMockEvents;
    
    if (query.entity) {
      filteredEvents = filteredEvents.filter(e => e.entity === query.entity);
    }
    
    if (query.stage) {
      filteredEvents = filteredEvents.filter(e => e.stage === query.stage);
    }
    
    if (query.source) {
      filteredEvents = filteredEvents.filter(e => 
        e.source.toLowerCase().includes(query.source!.toLowerCase())
      );
    }
    
    if (query.q) {
      const searchTerm = query.q.toLowerCase();
      filteredEvents = filteredEvents.filter(e =>
        e.source.toLowerCase().includes(searchTerm) ||
        e.hash.toLowerCase().includes(searchTerm) ||
        JSON.stringify(e.inputs).toLowerCase().includes(searchTerm) ||
        JSON.stringify(e.outputs).toLowerCase().includes(searchTerm) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm))
      );
    }
    
    if (query.dateFrom || query.dateTo) {
      const fromTime = query.dateFrom ? new Date(query.dateFrom).getTime() : 0;
      const toTime = query.dateTo ? new Date(query.dateTo).getTime() : Date.now();
      
      filteredEvents = filteredEvents.filter(e => {
        const eventTime = new Date(e.ts).getTime();
        return eventTime >= fromTime && eventTime <= toTime;
      });
    }
    
    // Sort by timestamp (most recent first)
    filteredEvents.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    
    // Apply pagination
    const limit = query.limit || 100;
    const offset = query.offset || 0;
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);
    
    console.log(`[Lineage] Search query "${query.q}" found ${filteredEvents.length} results`);
    
    return {
      items: paginatedEvents,
      total: filteredEvents.length,
      hasMore: offset + limit < filteredEvents.length
    };
    
  } catch (error) {
    console.error('[Lineage] Search failed:', error);
    throw new LineageError(
      'Failed to search lineage events',
      'DATABASE_ERROR',
      { query, error: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Get lineage events by signal ID (convenience method)
 */
export async function getLineageBySignal(
  signalId: string,
  includeDownstream = false
): Promise<LineageTrace> {
  const trace = await getLineageTrace({
    entity: 'signal',
    refId: signalId
  });
  
  if (includeDownstream) {
    // TODO: In production, find metrics and reports that reference this signal's hash
    console.log(`[Lineage] Downstream analysis for signal ${signalId} not implemented`);
  }
  
  return trace;
}

// =============================================================================
// Convenience Recording Functions
// =============================================================================

/**
 * Record signal ingest event
 */
export async function recordSignalIngest(
  signalId: string,
  provider: string,
  ingestData: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  },
  signalOutput: {
    type: string;
    value: unknown;
    timestamp: string;
    chain?: string;
    currency?: string;
  },
  notes?: string
): Promise<LineageEvent> {
  return recordLineageEvent({
    entity: 'signal',
    refId: signalId,
    stage: 'ingest',
    source: provider,
    inputs: ingestData,
    outputs: signalOutput,
    notes
  });
}

/**
 * Record signal transformation event
 */
export async function recordSignalTransform(
  signalId: string,
  transformerName: string,
  rawData: { rawValue: unknown; rawTimestamp?: string },
  normalizedData: {
    normalizedValue: unknown;
    confidenceScore?: number;
    canonicalSchema: string;
  },
  notes?: string
): Promise<LineageEvent> {
  return recordLineageEvent({
    entity: 'signal',
    refId: signalId,
    stage: 'transform',
    source: transformerName,
    inputs: rawData,
    outputs: normalizedData,
    notes
  });
}

/**
 * Record metric aggregation event
 */
export async function recordMetricAggregation(
  metricId: string,
  aggregatorName: string,
  inputSources: {
    metricKeys: string[];
    window: string;
    period: string;
  },
  aggregatedValues: Record<string, unknown>,
  notes?: string
): Promise<LineageEvent> {
  return recordLineageEvent({
    entity: 'metric',
    refId: metricId,
    stage: 'aggregate',
    source: aggregatorName,
    inputs: inputSources,
    outputs: aggregatedValues,
    notes
  });
}

/**
 * Record report export event
 */
export async function recordReportExport(
  reportId: string,
  generatorName: string,
  inputHashes: {
    kpisHash?: string;
    porHash?: string;
    summaryHash?: string;
    template: string;
    actor: string;
  },
  reportOutput: {
    file?: { path: string; sizeBytes: number; pages?: number };
    generationTimeMs?: number;
  },
  notes?: string
): Promise<LineageEvent> {
  return recordLineageEvent({
    entity: 'report',
    refId: reportId,
    stage: 'export',
    source: generatorName,
    inputs: inputHashes,
    outputs: reportOutput,
    notes
  });
}

// =============================================================================
// Mock Data for Development
// =============================================================================

/**
 * Get mock lineage events for development/testing
 */
async function getMockLineageEvents(entity: string, refId: string): Promise<LineageEvent[]> {
  // Generate mock events based on entity type and refId
  const baseTime = new Date('2025-09-29T10:00:00Z').getTime();
  
  if (entity === 'signal' && refId === 'defi_llama_tvl_ethereum') {
    return [
      {
        id: 1,
        entity: 'signal',
        refId: 'defi_llama_tvl_ethereum',
        stage: 'ingest',
        ts: new Date(baseTime).toISOString(),
        createdAt: new Date(baseTime).toISOString(),
        source: 'defillama',
        inputs: {
          url: 'https://api.llama.fi/protocol/ethereum',
          method: 'GET',
          headers: { 'user-agent': 'adaf-ingester' }
        },
        outputs: {
          type: 'tvl',
          chain: 'ethereum',
          value: 45234567890,
          timestamp: '2025-09-29T10:00:00Z',
          currency: 'USD'
        },
        hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        notes: 'DeFiLlama TVL ingestion for Ethereum mainnet'
      },
      {
        id: 2,
        entity: 'signal',
        refId: 'defi_llama_tvl_ethereum',
        stage: 'transform',
        ts: new Date(baseTime + 30000).toISOString(),
        createdAt: new Date(baseTime + 30000).toISOString(),
        source: 'ingest.normalizer',
        inputs: {
          rawValue: 45234567890,
          rawTimestamp: '2025-09-29T10:00:00Z'
        },
        outputs: {
          normalizedValue: 45234567890,
          confidenceScore: 0.95,
          validationRules: ['positive_value', 'recent_timestamp'],
          canonicalSchema: 'tvl_v2'
        },
        hash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a',
        notes: 'Applied normalization and validation rules'
      }
    ];
  }
  
  if (entity === 'report' && refId === 'onepager_2025q3_demo.pdf') {
    return [
      {
        id: 5,
        entity: 'report',
        refId: 'onepager_2025q3_demo.pdf',
        stage: 'export',
        ts: new Date(baseTime + 300000).toISOString(),
        createdAt: new Date(baseTime + 300000).toISOString(),
        source: 'pdf:generator',
        inputs: {
          kpisHash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2',
          porHash: 'd4e5f6789012345678901234567890abcdef1234567890abcdef1234567abc3',
          template: 'onepager_v2',
          actor: 'system@adaf.com'
        },
        outputs: {
          file: {
            path: '/reports/2025-09-29/onepager_2025q3_demo.pdf',
            sizeBytes: 87543,
            pages: 2
          },
          generationTimeMs: 2156
        },
        hash: 'e5f6789012345678901234567890abcdef1234567890abcdef1234567abcd4',
        notes: 'OnePager PDF generated with Q3 2025 KPIs and PoR data'
      }
    ];
  }
  
  return [];
}

/**
 * Get all mock events for search functionality
 */
async function getAllMockLineageEvents(): Promise<LineageEvent[]> {
  const signalEvents = await getMockLineageEvents('signal', 'defi_llama_tvl_ethereum');
  const reportEvents = await getMockLineageEvents('report', 'onepager_2025q3_demo.pdf');
  
  // Add mock metric events
  const metricEvents: LineageEvent[] = [
    {
      id: 3,
      entity: 'metric',
      refId: 'kpis.quarterly.2025q3',
      stage: 'aggregate',
      ts: '2025-09-29T10:05:00Z',
      createdAt: '2025-09-29T10:05:00Z',
      source: 'read-aggregator',
      inputs: {
        metricKeys: ['tvl.ethereum', 'tvl.bitcoin', 'flows.in', 'flows.out'],
        window: 'quarterly',
        period: '2025Q3'
      },
      outputs: {
        irr: 0.145,
        tvpi: 1.87,
        moic: 1.23,
        dpi: 0.45,
        rvpi: 1.42,
        navUsd: 125500000,
        flows: { in: 50000000, out: 15000000 }
      },
      hash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2',
      notes: 'Quarterly KPIs aggregated from TVL and cash flow signals'
    }
  ];
  
  return [...signalEvents, ...metricEvents, ...reportEvents];
}