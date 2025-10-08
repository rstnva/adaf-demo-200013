import { NextRequest, NextResponse } from 'next/server';
import { 
  LineageSearchResponse,
  LineageSearchQuery,
  isValidLineageEntity,
  isValidLineageStage,
  LineageError
} from '@/types/lineage';
import { searchLineageEvents } from '@/lib/lineage-storage';
import { incLineageSearch, observeLineageSearchDuration } from '@/lib/metrics';

/**
 * GET /api/read/lineage/search
 * Search lineage events by various criteria
 * Query params: q, entity?, stage?, source?, dateFrom?, dateTo?, limit?, offset?
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const entity = url.searchParams.get('entity');
    const stage = url.searchParams.get('stage');
    const source = url.searchParams.get('source');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const limitStr = url.searchParams.get('limit');
    const offsetStr = url.searchParams.get('offset');
    
    // Validate required parameters
    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: q (search query)' 
        },
        { status: 400 }
      );
    }
    
    // Validate optional entity filter
    if (entity && !isValidLineageEntity(entity)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid entity type. Must be: signal, metric, or report' 
        },
        { status: 400 }
      );
    }
    
    // Validate optional stage filter
    if (stage && !isValidLineageStage(stage)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid stage. Must be: ingest, transform, aggregate, or export' 
        },
        { status: 400 }
      );
    }
    
    // Parse and validate date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid dateFrom format. Use ISO date string' 
          },
          { status: 400 }
        );
      }
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      if (isNaN(toDate.getTime())) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid dateTo format. Use ISO date string' 
          },
          { status: 400 }
        );
      }
    }
    
    // Parse pagination parameters
    const limit = limitStr ? parseInt(limitStr) : 100; // Default to 100
    const offset = offsetStr ? parseInt(offsetStr) : 0; // Default to 0
    
    if (limit <= 0 || limit > 1000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid limit. Must be between 1 and 1000' 
        },
        { status: 400 }
      );
    }
    
    if (offset < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid offset. Must be >= 0' 
        },
        { status: 400 }
      );
    }
    
    // Build search query
    const searchQuery: LineageSearchQuery = {
      q: q.trim(),
      ...(entity && isValidLineageEntity(entity) && { entity }),
      ...(stage && isValidLineageStage(stage) && { stage }),
      ...(source && { source: source.trim() }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      limit,
      offset
    };
    
    // Execute search with metrics
    const startTime = Date.now();
    const searchResults = await searchLineageEvents(searchQuery);
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    
    // Record metrics for successful search
    incLineageSearch(entity || undefined, stage || undefined, source || undefined, 'ok');
    observeLineageSearchDuration(duration);
    
    const response: LineageSearchResponse = {
      ...searchResults,
      success: true
    };
    
    console.log(`✓ Lineage search "${q}" found ${searchResults.total} results (showing ${searchResults.items.length}) in ${duration}s`);
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('❌ Lineage search API error:', error);
    
    // Record error metrics
    const url = new URL(request.url);
    const entity = url.searchParams.get('entity');
    const stage = url.searchParams.get('stage');
    const source = url.searchParams.get('source');
    incLineageSearch(entity || undefined, stage || undefined, source || undefined, 'error');
    
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