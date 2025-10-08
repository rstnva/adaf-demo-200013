import { NextResponse } from 'next/server';
import { 
  DeliverReportRequest, 
  DeliverReportResponse,
  ReportDeliveryError 
} from '@/types/scheduling';
import { 
  sanitizeRecipients 
} from '@/lib/scheduling-utils';
import { 
  loadReportWithVerification, 
  recordDelivery 
} from '@/lib/report-storage';

/**
 * POST /api/actions/report/deliver
 * Delivers a generated report to specified recipients via email or S3
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: DeliverReportRequest = await request.json();
    
    // Validate required fields
    if (!body.reportId || !body.recipients || !body.actor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: reportId, recipients, actor' 
        },
        { status: 400 }
      );
    }
    
    // Validate and sanitize recipients
    const { valid: validRecipients, invalid: invalidRecipients } = sanitizeRecipients(body.recipients);
    
    if (validRecipients.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid recipients provided',
          invalidRecipients 
        },
        { status: 400 }
      );
    }
    
    if (invalidRecipients.length > 0) {
      console.warn(`⚠️  Invalid recipients filtered out: ${invalidRecipients.join(', ')}`);
    }
    
    // Load and verify report integrity
    const reportResult = await loadReportWithVerification(body.reportId);
    
    if (!reportResult.success || !reportResult.report) {
      return NextResponse.json(
        { 
          success: false, 
          error: reportResult.error || 'Report not found' 
        },
        { status: 404 }
      );
    }
    
    if (!reportResult.integrityValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Report file integrity check failed - file may be corrupted' 
        },
        { status: 422 }
      );
    }
    
    const report = reportResult.report;
    const deliveryMethod = body.deliveryMethod || 'email';
    
    console.log(`📧 Starting delivery of report ${report.id} (${report.type}) to ${validRecipients.length} recipients`);
    
    // Track delivery attempts and results
    const deliveryResults: Array<{
      recipient: string;
      status: 'sent' | 'failed';
      error?: string;
    }> = [];
    
    // Mock delivery process - in production this would integrate with actual email/S3 services
    for (const recipient of validRecipients) {
      try {
        if (deliveryMethod === 'email') {
          // Mock email delivery
          await mockEmailDelivery(report, recipient, body.actor, body.notes);
        } else if (deliveryMethod === 's3') {
          // Mock S3 delivery
          await mockS3Delivery(report, recipient, body.actor, body.notes);
        }
        
        // Record successful delivery
        await recordDelivery(
          report.id, 
          recipient, 
          deliveryMethod,
          body.actor,
          true
        );
        
        deliveryResults.push({ recipient, status: 'sent' });
        console.log(`✓ Delivered to ${recipient} via ${deliveryMethod}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown delivery error';
        
        // Record failed delivery
        await recordDelivery(
          report.id,
          recipient,
          deliveryMethod,
          body.actor,
          false,
          errorMessage
        );
        
        deliveryResults.push({ 
          recipient, 
          status: 'failed', 
          error: errorMessage 
        });
        
        console.error(`❌ Failed to deliver to ${recipient}: ${errorMessage}`);
      }
    }
    
    // Calculate delivery statistics
    const successfulDeliveries = deliveryResults.filter(r => r.status === 'sent').length;
    const failedDeliveries = deliveryResults.filter(r => r.status === 'failed').length;
    
    const response: DeliverReportResponse = {
      success: successfulDeliveries > 0,
      deliveryId: `delivery_${Date.now()}`,
      deliveredCount: successfulDeliveries,
      failedCount: failedDeliveries,
      errors: deliveryResults
        .filter(r => r.status === 'failed')
        .map(r => ({
          recipient: r.recipient,
          error: r.error || 'Unknown error'
        }))
    };
    
    console.log(`📊 Delivery complete: ${successfulDeliveries} sent, ${failedDeliveries} failed`);
    
    // Return appropriate status code
    if (failedDeliveries > 0 && successfulDeliveries === 0) {
      return NextResponse.json(response, { status: 500 });
    } else if (failedDeliveries > 0) {
      return NextResponse.json(response, { status: 207 }); // Multi-status
    } else {
      return NextResponse.json(response, { status: 200 });
    }
    
  } catch (error) {
    console.error('❌ Report delivery API error:', error);
    
    if (error instanceof ReportDeliveryError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal delivery system error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Mock email delivery function - replace with actual email service integration
 */
async function mockEmailDelivery(
  report: { id: string; type: string; period: string; url: string; fileSizeBytes: number }, 
  recipient: string, 
  actor: string, 
  notes?: string
): Promise<void> {
  // Simulate email delivery delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Mock occasional delivery failure (5% chance for testing)
  if (Math.random() < 0.05) {
    throw new Error(`SMTP server temporarily unavailable for ${recipient}`);
  }
  
  console.log(`📧 [MOCK] Email sent to ${recipient}`);
  console.log(`   Subject: ${report.type === 'onepager' ? 'ADAF OnePager' : 'ADAF Quarterly Report'} - ${report.period}`);
  console.log(`   Attachment: ${report.url} (${report.fileSizeBytes} bytes)`);
  console.log(`   Sent by: ${actor}`);
  if (notes) console.log(`   Notes: ${notes}`);
}

/**
 * Mock S3 delivery function - replace with actual S3 integration
 */
async function mockS3Delivery(
  report: { id: string; type: string; period: string; url: string; fileSizeBytes: number }, 
  s3Path: string, 
  actor: string, 
  notes?: string
): Promise<void> {
  // Simulate S3 upload delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mock occasional S3 failure (3% chance for testing)
  if (Math.random() < 0.03) {
    throw new Error(`S3 upload failed: Access denied for bucket ${s3Path}`);
  }
  
  console.log(`☁️  [MOCK] S3 upload completed to ${s3Path}`);
  console.log(`   File: ${report.url} → s3://${s3Path}/${report.id}.pdf`);
  console.log(`   Size: ${report.fileSizeBytes} bytes`);
  console.log(`   Uploaded by: ${actor}`);
  if (notes) console.log(`   Notes: ${notes}`);
}