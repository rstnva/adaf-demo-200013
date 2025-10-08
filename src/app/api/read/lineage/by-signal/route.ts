import { NextRequest, NextResponse } from 'next/server';
import { 
  LineageTraceResponse,
  LineageError
} from '@/types/lineage';
import { getLineageBySignal } from '@/lib/lineage-storage';

/**
 * GET /api/read/lineage/by-signal
 * Retrieve lineage trace for a specific signal
 * Query params: id, includeDownstream?
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const includeDownstreamStr = url.searchParams.get('includeDownstream');
    
    // Validate required parameters
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: id (signal ID)' 
        },
        { status: 400 }
      );
    }
    
    // Parse boolean parameter
    const includeDownstream = includeDownstreamStr === 'true';
    
    // Retrieve signal lineage
    const trace = await getLineageBySignal(id, includeDownstream);
    
    const response: LineageTraceResponse = {
      trace,
      success: true
    };
    
    console.log(`✓ Retrieved signal lineage for ${id} (${trace.eventCount} events)`);
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('❌ Signal lineage API error:', error);
    
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