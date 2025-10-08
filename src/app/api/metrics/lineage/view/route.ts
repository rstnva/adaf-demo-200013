import { NextRequest, NextResponse } from 'next/server';
import { incLineageView } from '@/lib/metrics';

/**
 * POST /api/metrics/lineage/view
 * Track lineage UI views for metrics (fire-and-forget)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { entity, refId } = body;
    
    // Validar entity type
    if (!entity || !['signal', 'metric', 'report'].includes(entity)) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity. Must be signal, metric, or report' },
        { status: 400 }
      );
    }
    
    // refId es opcional para metrics - solo verificamos que existe
    if (!refId || typeof refId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid refId. Must be a non-empty string' },
        { status: 400 }
      );
    }
    
    // Incrementar métrica
    incLineageView(entity);
    
    console.log(`✓ Lineage view tracked: ${entity}:${refId}`);
    
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Error tracking lineage view:', error);
    
    // No fallar - las métricas son fire-and-forget
    return NextResponse.json(
      { success: false, error: 'Internal metrics error' },
      { status: 500 }
    );
  }
}