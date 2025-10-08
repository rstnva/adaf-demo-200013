import { NextRequest, NextResponse } from 'next/server';
import { 
  LineageTraceResponse,
  LineageTraceQuery,
  isValidLineageEntity,
  isValidLineageStage,
  LineageError
} from '@/types/lineage';
import { getLineageTrace } from '@/lib/lineage-storage';

/**
 * GET /api/read/lineage/trace
 * Retrieve complete lineage trace for an entity
 * Query params: entity, refId, stage?, limit?, offset?
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const entity = url.searchParams.get('entity');
    const refId = url.searchParams.get('refId');
    const stage = url.searchParams.get('stage');
    const limitStr = url.searchParams.get('limit');
    const offsetStr = url.searchParams.get('offset');
    
    // Validate required parameters
    if (!entity) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: entity' 
        },
        { status: 400 }
      );
    }
    
    if (!refId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: refId' 
        },
        { status: 400 }
      );
    }
    
    // Validate entity type
    if (!isValidLineageEntity(entity)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid entity type. Must be: signal, metric, or report' 
        },
        { status: 400 }
      );
    }
    
    // Validate stage if provided
    if (stage && !isValidLineageStage(stage)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid stage. Must be: ingest, transform, aggregate, or export' 
        },
        { status: 400 }
      );
    }
    
    // Parse pagination parameters
    const limit = limitStr ? parseInt(limitStr) : undefined;
    const offset = offsetStr ? parseInt(offsetStr) : undefined;
    
    if (limit && (limit <= 0 || limit > 1000)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid limit. Must be between 1 and 1000' 
        },
        { status: 400 }
      );
    }
    
    if (offset && offset < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid offset. Must be >= 0' 
        },
        { status: 400 }
      );
    }
    
    // Build query
    const query: LineageTraceQuery = {
      entity,
      refId,
      ...(stage && isValidLineageStage(stage) && { stage }),
      ...(limit && { limit }),
      ...(offset && { offset })
    };
    
    // Retrieve lineage trace
    const trace = await getLineageTrace(query);
    
    const response: LineageTraceResponse = {
      trace,
      success: true
    };
    
    console.log(`✓ Retrieved lineage trace for ${entity}:${refId} (${trace.eventCount} events)`);
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('❌ Lineage trace API error:', error);
    
    if (error instanceof LineageError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code
        },
        { status: error.code === 'DATABASE_ERROR' ? 500 : 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal lineage service error' 
      },
      { status: 500 }
    );
  }
}