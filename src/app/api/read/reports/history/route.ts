import { NextRequest, NextResponse } from 'next/server';
import type { ReportHistoryResponse } from '@/types/scheduling';

// Extended type for mock data
type ReportWithStats = {
  id: string;
  type: 'onepager' | 'quarterly';
  period: string;
  url: string;
  sha256: string;
  fileSizeBytes: number;
  createdAt: string;
  actor: string;
  status: 'ok' | 'failed' | 'pending';
  recipients: string[];
  notes?: string;
  deliveredAt?: string;
  deliveryActor?: string;
  deliveryNotes?: string;
  deliveryAttempts: number;
  successfulDeliveries: number;
  lastDeliveryAt?: string;
};

// ================================================================================================
// GET /api/read/reports/history — Report History with Delivery Stats
// ================================================================================================
// Returns paginated list of generated reports with delivery statistics and integrity status
// ================================================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') as 'onepager' | 'quarterly' | null;
    const period = searchParams.get('period');
    const status = searchParams.get('status');
    const actor = searchParams.get('actor');

    // In production, this would query the database with filters
    // const query = `
    //   SELECT r.*, 
    //          COUNT(d.id) as delivery_attempts,
    //          COUNT(d.id) FILTER (WHERE d.delivery_status = 'sent') as successful_deliveries,
    //          MAX(d.delivered_at) as last_delivery_at
    //   FROM generated_reports r
    //   LEFT JOIN report_deliveries d ON r.id = d.report_id
    //   WHERE ($1::text IS NULL OR r.type = $1)
    //   AND ($2::text IS NULL OR r.period = $2)
    //   AND ($3::text IS NULL OR r.status = $3)
    //   AND ($4::text IS NULL OR r.actor ILIKE '%' || $4 || '%')
    //   GROUP BY r.id
    //   ORDER BY r.created_at DESC
    //   LIMIT $5 OFFSET $6
    // `;

    // Mock data for demo - in production this would come from database
    let mockReports: ReportWithStats[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'quarterly' as const,
        period: '2025Q3',
        url: '/tmp/reports/quarterly_2025Q3_20250930.pdf',
        sha256: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
        fileSizeBytes: 102400,
        createdAt: '2025-09-30T18:30:00Z',
        actor: 'cron@adaf.system',
        status: 'ok' as const,
        recipients: ['regulatory@adaf.com', 'audit@adaf.com', 'cfo@adaf.com'],
        notes: 'Q3 2025 comprehensive quarterly review for stakeholders',
        deliveredAt: '2025-09-30T18:35:00Z',
        deliveryActor: 'auto-delivery@adaf.system',
        deliveryNotes: 'Automated delivery to regulatory team',
        deliveryAttempts: 3,
        successfulDeliveries: 3,
        lastDeliveryAt: '2025-09-30T18:35:00Z'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        type: 'onepager' as const,
        period: '2025-09',
        url: '/tmp/reports/onepager_2025-09_20250930.pdf',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        fileSizeBytes: 69420,
        createdAt: '2025-09-30T12:00:00Z',
        actor: 'cron@adaf.system',
        status: 'ok' as const,
        recipients: ['investor-relations@adaf.com', 'board@adaf.com'],
        notes: 'Automated September monthly report',
        deliveredAt: '2025-09-30T12:05:00Z',
        deliveryActor: 'auto-delivery@adaf.system',
        deliveryAttempts: 2,
        successfulDeliveries: 2,
        lastDeliveryAt: '2025-09-30T12:05:00Z'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        type: 'onepager' as const,
        period: '2025-08',
        url: '/tmp/reports/onepager_2025-08_20250831.pdf',
        sha256: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
        fileSizeBytes: 67890,
        createdAt: '2025-08-31T17:45:00Z',
        actor: 'portfolio-manager@adaf.com',
        status: 'ok' as const,
        recipients: ['board@adaf.com'],
        notes: 'August performance summary for monthly board meeting',
        deliveredAt: '2025-08-31T17:50:00Z',
        deliveryActor: 'portfolio-manager@adaf.com',
        deliveryAttempts: 1,
        successfulDeliveries: 1,
        lastDeliveryAt: '2025-08-31T17:50:00Z'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        type: 'quarterly' as const,
        period: '2025Q2',
        url: '/tmp/reports/quarterly_2025Q2_20250630.pdf',
        sha256: 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
        fileSizeBytes: 98765,
        createdAt: '2025-06-30T20:15:00Z',
        actor: 'compliance@adaf.com',
        status: 'ok' as const,
        recipients: ['regulatory@adaf.com', 'external-auditor@kpmg.com'],
        notes: 'Q2 regulatory filing with enhanced compliance metrics',
        deliveredAt: '2025-06-30T20:25:00Z',
        deliveryActor: 'compliance@adaf.com',
        deliveryAttempts: 4,
        successfulDeliveries: 2,
        lastDeliveryAt: '2025-06-30T20:25:00Z'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        type: 'onepager' as const,
        period: '2025-07',
        url: '/tmp/reports/onepager_2025-07_20250731.pdf',
        sha256: 'f7c3bc1d808e04732adf679965ccc34ca7ae3441dee506c7700af472e028f2b3',
        fileSizeBytes: 71234,
        createdAt: '2025-07-31T16:20:00Z',
        actor: 'investment-committee@adaf.com',
        status: 'failed' as const,
        recipients: [],
        notes: 'July report - delivery failed due to SMTP issues',
        deliveryAttempts: 3,
        successfulDeliveries: 0,
        lastDeliveryAt: undefined
      }
    ];

    // Apply filters
    if (type) {
      mockReports = mockReports.filter(r => r.type === type);
    }
    if (period) {
      mockReports = mockReports.filter(r => r.period === period);
    }
    if (status) {
      mockReports = mockReports.filter(r => r.status === status);
    }
    if (actor) {
      mockReports = mockReports.filter(r => 
        r.actor.toLowerCase().includes(actor.toLowerCase())
      );
    }

    // Apply pagination
    const total = mockReports.length;
    const paginatedReports = mockReports.slice(offset, offset + limit);
    
    const response: ReportHistoryResponse = {
      reports: paginatedReports,
      total,
      hasMore: offset + limit < total
    };

    console.log(`[History] Retrieved ${paginatedReports.length}/${total} reports (offset: ${offset}, limit: ${limit})`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[History] Failed to fetch report history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report history' },
      { status: 500 }
    );
  }
}