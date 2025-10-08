import { NextResponse } from 'next/server';
import type { ReportHealthResponse } from '@/types/scheduling';

// ================================================================================================
// GET /api/read/reports/health — Report System Health Status
// ================================================================================================
// Returns health indicators for the report generation and delivery system
// ================================================================================================

export async function GET(): Promise<NextResponse> {
  try {
    // In production, this would query the database for health metrics
    // const healthQuery = `
    //   SELECT
    //     MAX(CASE WHEN type = 'onepager' THEN created_at END) as last_onepager_at,
    //     MAX(CASE WHEN type = 'quarterly' THEN created_at END) as last_quarterly_at,
    //     COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as reports_last_30d,
    //     COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '7 days') as failed_last_7d,
    //     AVG(file_size_bytes) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') as avg_file_size_90d
    //   FROM generated_reports
    // `;

    // Mock health data for demo
    const now = new Date();
    const lastOnePagerAt = '2025-09-30T12:00:00Z';
    const lastQuarterlyAt = '2025-09-30T18:30:00Z';
    const reportsLast30d = 8;
    const failedLast7d = 1;
    const avgFileSizeBytes = 75000;

    // Calculate time since last reports
    const lastOnePager = new Date(lastOnePagerAt);
    const lastQuarterly = new Date(lastQuarterlyAt);
    const timeSinceOnePager = now.getTime() - lastOnePager.getTime();
    const timeSinceQuarterly = now.getTime() - lastQuarterly.getTime();

    // Health status calculation
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check OnePager generation frequency (should be monthly)
    const daysSinceOnePager = Math.floor(timeSinceOnePager / (1000 * 60 * 60 * 24));
    if (daysSinceOnePager > 35) {
      status = 'critical';
      issues.push('OnePager generation is overdue (>35 days)');
      recommendations.push('Check cron job configuration for monthly report generation');
    } else if (daysSinceOnePager > 32) {
      status = 'warning';
      issues.push('OnePager generation is approaching deadline');
      recommendations.push('Verify next scheduled generation time');
    }

    // Check Quarterly generation frequency (should be quarterly ~90 days)
    const daysSinceQuarterly = Math.floor(timeSinceQuarterly / (1000 * 60 * 60 * 24));
    if (daysSinceQuarterly > 100) {
      status = 'critical';
      issues.push('Quarterly report generation is overdue (>100 days)');
      recommendations.push('Check quarterly report scheduling and generation system');
    } else if (daysSinceQuarterly > 95) {
      if (status !== 'critical') status = 'warning';
      issues.push('Quarterly report generation is approaching deadline');
      recommendations.push('Prepare for next quarterly report generation');
    }

    // Check recent failure rate
    if (failedLast7d > 0) {
      if (failedLast7d > 2) {
        status = 'critical';
        issues.push(`High failure rate: ${failedLast7d} failed reports in last 7 days`);
        recommendations.push('Investigate delivery system and fix recurring issues');
      } else {
        if (status !== 'critical') status = 'warning';
        issues.push(`Recent failures detected: ${failedLast7d} failed reports in last 7 days`);
        recommendations.push('Monitor delivery system for potential issues');
      }
    }

    // Check generation frequency
    if (reportsLast30d < 2) {
      if (status !== 'critical') status = 'warning';
      issues.push('Low report generation activity in last 30 days');
      recommendations.push('Verify automated scheduling is enabled and functioning');
    }

    // Check file size consistency (detect corruption or generation issues)
    if (avgFileSizeBytes < 30000) {
      if (status !== 'critical') status = 'warning';
      issues.push('Average file size is unusually small, possible generation issues');
      recommendations.push('Check PDF generation process for completeness');
    } else if (avgFileSizeBytes > 200000) {
      if (status !== 'critical') status = 'warning';
      issues.push('Average file size is unusually large, check for bloated content');
      recommendations.push('Optimize report generation to reduce file sizes');
    }

    // Additional proactive recommendations
    if (status === 'healthy') {
      recommendations.push('System is operating normally');
      recommendations.push('Consider setting up alerting for critical thresholds');
    }

    // Build response
    const healthResponse: ReportHealthResponse = {
      lastOnePagerAt,
      lastQuarterlyAt,
      reportsLast30d,
      failedLast7d,
      avgFileSizeBytes: Math.round(avgFileSizeBytes),
      status,
      issues,
      recommendations
    };

    console.log(`[Health] System status: ${status}, ${issues.length} issues, ${recommendations.length} recommendations`);

    return NextResponse.json(healthResponse);

  } catch (error) {
    console.error('[Health] Failed to fetch system health:', error);
    
    // Return critical status on system error
    const errorResponse: ReportHealthResponse = {
      reportsLast30d: 0,
      failedLast7d: 0,
      avgFileSizeBytes: 0,
      status: 'critical',
      issues: ['Unable to fetch system health metrics'],
      recommendations: ['Check database connectivity and system logs']
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}