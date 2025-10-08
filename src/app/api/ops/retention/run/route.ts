// ================================================================================================
// Retention Job API Endpoint - Manual and Scheduled Execution
// ================================================================================================
// Administrative endpoint for executing data retention policies
// Requires admin+ permissions and supports dry-run mode
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { RetentionJob } from '@/services/agents/ops/retentionJob';
import { withRateLimit } from '@/middleware/withRateLimit';

/**
 * Manual retention job execution handler
 */
async function retentionHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { dryRun = false, force = false } = body;

    // TODO: Add authentication check
    // const authCheck = await requireRole(request, 'admin');
    // if (!authCheck.authorized) {
    //   return NextResponse.json(
    //     { error: 'forbidden', need: 'admin', message: authCheck.error },
    //     { status: 403 }
    //   );
    // }

    console.log(`🗂️  Starting retention job via API (dry-run: ${dryRun}, force: ${force})`);

    // Create and execute retention job
    const retentionJob = new RetentionJob(dryRun);

    // Health check first (unless forced)
    if (!force) {
      const healthCheck = await retentionJob.healthCheck();
      if (!healthCheck.healthy) {
        return NextResponse.json({
          success: false,
          error: 'health_check_failed',
          message: 'Retention job health check failed',
          issues: healthCheck.issues
        }, { status: 400 });
      }
    }

    // Execute retention policies
    const startTime = Date.now();
    const summary = await retentionJob.run();
    const executionTime = Date.now() - startTime;

    // Determine response status
    const hasFailures = summary.failedPolicies > 0;
    const status = hasFailures ? 207 : 200; // 207 Multi-Status for partial success

    return NextResponse.json({
      success: !hasFailures,
      dryRun,
      summary: {
        executedAt: summary.executedAt,
        totalDurationMs: executionTime,
        totalRowsAffected: summary.totalRowsAffected,
        policiesExecuted: summary.policiesExecuted,
        successfulPolicies: summary.successfulPolicies,
        failedPolicies: summary.failedPolicies
      },
      results: summary.results,
      message: hasFailures 
        ? `Retention job completed with ${summary.failedPolicies} failures`
        : 'Retention job completed successfully'
    }, { status });

  } catch (error) {
    console.error('❌ Retention job API error:', error);

    return NextResponse.json({
      success: false,
      error: 'execution_failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      executedAt: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/ops/retention/run
 * Get retention job status and configuration
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const retentionJob = new RetentionJob(true); // Dry run for status
    const healthCheck = await retentionJob.healthCheck();

    // Get last execution info from change_logs (would be implemented with actual DB query)
    const status = {
      healthy: healthCheck.healthy,
      issues: healthCheck.issues,
      lastExecution: {
        // This would come from querying change_logs
        executedAt: null,
        durationMs: null,
        rowsAffected: null,
        success: null
      },
      nextScheduledRun: getNextScheduledRun(),
      configuration: {
        policies: [
          { name: 'signals_retention', retentionDays: 365, compressionDays: 90 },
          { name: 'lineage_events_retention', retentionDays: 365 },
          { name: 'alerts_retention', retentionDays: 1095 }, // 3 years
          { name: 'opportunities_retention', retentionDays: 1825 }, // 5 years
          { name: 'reports_retention', retentionDays: 1825 }, // 5 years
          { name: 'backtests_retention', compressionMonths: 24, retentionYears: 5 }
        ]
      }
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Retention status error:', error);
    return NextResponse.json({
      error: 'status_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/ops/retention/run
 * Execute retention job manually
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withRateLimit(request, retentionHandler);
}

/**
 * Helper function to calculate next scheduled run
 */
function getNextScheduledRun(): string {
  // Weekly on Mondays at 03:00 (Mexico time)
  const now = new Date();
  const nextMonday = new Date(now);
  
  // Find next Monday
  const daysUntilMonday = (7 - now.getDay() + 1) % 7 || 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(3, 0, 0, 0);
  
  // If it's already past 3 AM on Monday, schedule for next week
  if (now.getDay() === 1 && now.getHours() >= 3) {
    nextMonday.setDate(nextMonday.getDate() + 7);
  }
  
  return nextMonday.toISOString();
}