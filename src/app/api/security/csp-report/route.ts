// ================================================================================================
// CSP Violation Report Handler
// ================================================================================================
// Handles Content Security Policy violation reports for monitoring and debugging
// Logs violations to console and optionally to database for analysis
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';

// CSP violation report structure
interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: string;
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code': number;
    'script-sample'?: string;
  };
}

// Simple metrics counter for CSP violations
const cspViolationCounts = new Map<string, number>();

/**
 * POST /api/security/csp-report
 * Handle CSP violation reports
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the CSP report
    const report = await request.json() as CSPViolationReport;
    const violation = report['csp-report'];
    
    if (!violation) {
      console.warn('Invalid CSP report format received');
      return new NextResponse('Invalid report format', { status: 400 });
    }
    
    // Extract key information
    const violationType = violation['violated-directive'] || violation['effective-directive'] || 'unknown';
    const blockedUri = violation['blocked-uri'] || 'unknown';
    const documentUri = violation['document-uri'] || 'unknown';
    const sourceFile = violation['source-file'] || 'unknown';
    
    // Count violations by type
    const violationKey = `${violationType}:${blockedUri}`;
    const currentCount = cspViolationCounts.get(violationKey) || 0;
    cspViolationCounts.set(violationKey, currentCount + 1);
    
    // Log the violation (in production, consider structured logging)
    console.warn('🛡️  CSP Violation Report:', {
      type: violationType,
      blockedUri,
      documentUri,
      sourceFile,
      line: violation['line-number'],
      column: violation['column-number'],
      sample: violation['script-sample']?.substring(0, 100),
      count: currentCount + 1,
      timestamp: new Date().toISOString()
    });
    
    // In production, you might want to store this in a database
    // await logCSPViolation(violation);
    
    // For demo purposes, let's simulate some common violations and their handling
    if (violationType.includes('script-src')) {
      console.log('🔍 Script source violation - check for inline scripts or unauthorized external scripts');
    } else if (violationType.includes('style-src')) {
      console.log('🎨 Style source violation - check for inline styles or external stylesheets');
    } else if (violationType.includes('img-src')) {
      console.log('🖼️  Image source violation - check for external image domains');
    } else if (violationType.includes('connect-src')) {
      console.log('🔗 Connection source violation - check for API calls or WebSocket connections');
    }
    
    // Return success (CSP expects 204 No Content)
    return new NextResponse(null, { status: 204 });
    
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * GET /api/security/csp-report
 * Get CSP violation statistics (for monitoring)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Convert map to object for JSON serialization
    const violations: Record<string, number> = {};
    for (const [key, count] of cspViolationCounts.entries()) {
      violations[key] = count;
    }
    
    const stats = {
      totalViolations: Array.from(cspViolationCounts.values()).reduce((sum, count) => sum + count, 0),
      uniqueViolations: cspViolationCounts.size,
      violations,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Error getting CSP stats:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Helper function to simulate database logging (for production)
 */
async function logCSPViolation(violation: CSPViolationReport['csp-report']): Promise<void> {
  // In production, you would implement database logging here
  // Example:
  // await prisma.cspViolations.create({
  //   data: {
  //     documentUri: violation['document-uri'],
  //     violatedDirective: violation['violated-directive'],
  //     blockedUri: violation['blocked-uri'],
  //     sourceFile: violation['source-file'],
  //     lineNumber: violation['line-number'],
  //     columnNumber: violation['column-number'],
  //     scriptSample: violation['script-sample'],
  //     createdAt: new Date()
  //   }
  // });
}