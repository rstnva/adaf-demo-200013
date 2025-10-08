import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// In-memory metrics storage (in production, this would be a proper metrics backend)
const metrics = new Map<string, number>();

const UiEventSchema = z.object({
  category: z.string().min(1).max(50),
  action: z.string().min(1).max(100),
  context: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = UiEventSchema.parse(body);
    
    // Create metric key
    const metricKey = `adaf_ui_events_total{category="${event.category}",action="${event.action}"}`;
    
    // Increment counter
    const current = metrics.get(metricKey) || 0;
    metrics.set(metricKey, current + 1);
    
    // Also track specific categories with more detail
    if (event.category === 'Hotkey') {
      const hotkeyMetric = `adaf_hotkey_usage_total{action="${event.action}"}`;
      const hotkeyCount = metrics.get(hotkeyMetric) || 0;
      metrics.set(hotkeyMetric, hotkeyCount + 1);
    }
    
    if (event.category === 'Spotlight') {
      const spotlightMetric = `adaf_spotlight_exec_total{cmd="${event.action}"}`;
      const spotlightCount = metrics.get(spotlightMetric) || 0;
      metrics.set(spotlightMetric, spotlightCount + 1);
    }
    
    if (event.category === 'Research') {
      const researchMetric = `adaf_research_snapshot_total{action="${event.action}"}`;
      const researchCount = metrics.get(researchMetric) || 0;
      metrics.set(researchMetric, researchCount + 1);
    }
    
    return NextResponse.json({ 
      success: true, 
      metric: metricKey,
      count: metrics.get(metricKey)
    });
    
  } catch (error) {
    console.error('UI Event tracking error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current metrics (for debugging/monitoring)
export async function GET() {
  const metricsObject = Object.fromEntries(metrics.entries());
  
  return NextResponse.json({
    metrics: metricsObject,
    timestamp: new Date().toISOString(),
    total_events: Array.from(metrics.values()).reduce((sum, count) => sum + count, 0),
  });
}