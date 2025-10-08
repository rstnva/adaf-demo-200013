import * as cron from 'node-cron';
import { ReportType } from '@/types/reports';
import { 
  GeneratedReport, 
  ReportSchedulingError 
} from '@/types/scheduling';
import { 
  getCurrentPeriodInfo 
} from './scheduling-utils';
import { 
  saveReportWithIntegrity, 
  recordScheduleRun 
} from './report-storage';

// Cron schedule: Every Monday at 9:00 AM Mexico City time
const WEEKLY_SCHEDULE = '0 9 * * 1';

// Job registry to manage active cron jobs
const activeJobs: Map<string, cron.ScheduledTask> = new Map();

// Simple schedule config for demo
const DEFAULT_CONFIG = {
  enableAutoGeneration: true,
  onePagerDay: 28,    // 28th of month (or last day if shorter)
  quarterlyDay: 30    // 30th of quarter-end month (or last day if shorter)
};

/**
 * Check if it's time to generate a report (simplified version)
 */
function shouldGenerateReportSimple(type: ReportType): boolean {
  if (!DEFAULT_CONFIG.enableAutoGeneration) {
    return false;
  }
  
  const now = new Date();
  
  if (type === 'onepager') {
    // Generate on 28th of month or last day if month is shorter
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(DEFAULT_CONFIG.onePagerDay, daysInMonth);
    return now.getDate() === targetDay;
  }
  
  if (type === 'quarterly') {
    // Generate on 30th of quarter-end months (March, June, September, December)
    const quarterEndMonths = [3, 6, 9, 12];
    const isQuarterEndMonth = quarterEndMonths.includes(now.getMonth() + 1);
    
    if (!isQuarterEndMonth) return false;
    
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(DEFAULT_CONFIG.quarterlyDay, daysInMonth);
    return now.getDate() === targetDay;
  }
  
  return false;
}

/**
 * Generates a report of the specified type with automatic period detection
 */
async function generateScheduledReport(reportType: ReportType): Promise<GeneratedReport> {
  const periodInfo = getCurrentPeriodInfo();
  
  // Mock PDF generation - in production this would call actual PDF generation service
  const mockPdfBuffer = Buffer.from(`
    ${reportType} Report
    Period: ${periodInfo.period}
    Generated: ${new Date().toISOString()}
    Data: [Mock institutional data for ${reportType}]
  `);
  
  // Save report with integrity checking using correct options format
  const savedReportResult = await saveReportWithIntegrity({
    type: reportType,
    period: periodInfo.period,
    pdfBuffer: mockPdfBuffer,
    actor: 'cron',
    notes: `Automatically generated ${reportType} report`
  });
  
  if (!savedReportResult.success || !savedReportResult.report) {
    throw new Error(`Failed to save ${reportType} report: ${savedReportResult.error}`);
  }
  
  console.log(`✓ Generated ${reportType} report for period: ${periodInfo.period}`);
  return savedReportResult.report;
}

/**
 * Main scheduled job function that runs weekly
 */
async function executeWeeklyReportGeneration(): Promise<void> {
  const startTime = new Date();
  console.log(`🕐 Starting weekly report generation run`);
  
  try {
    const generatedReports: string[] = [];
    let errorCount = 0;
    
    // Check if OnePager should be generated (monthly)
    if (shouldGenerateReportSimple('onepager')) {
      try {
        await recordScheduleRun('onepager', 'running');
        const onePagerReport = await generateScheduledReport('onepager');
        generatedReports.push(onePagerReport.id);
        await recordScheduleRun('onepager', 'success', { reportsGenerated: 1 });
        console.log('✓ OnePager generated successfully');
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await recordScheduleRun('onepager', 'failed', { errorMessage: errorMsg });
        console.error(`❌ Failed to generate OnePager: ${errorMsg}`);
      }
    } else {
      console.log('⏭️  OnePager not due for generation this period');
      await recordScheduleRun('onepager', 'skipped', { triggerReason: 'not_scheduled' });
    }
    
    // Check if Quarterly should be generated (quarterly)
    if (shouldGenerateReportSimple('quarterly')) {
      try {
        await recordScheduleRun('quarterly', 'running');
        const quarterlyReport = await generateScheduledReport('quarterly');
        generatedReports.push(quarterlyReport.id);
        await recordScheduleRun('quarterly', 'success', { reportsGenerated: 1 });
        console.log('✓ Quarterly report generated successfully');
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await recordScheduleRun('quarterly', 'failed', { errorMessage: errorMsg });
        console.error(`❌ Failed to generate Quarterly: ${errorMsg}`);
      }
    } else {
      console.log('⏭️  Quarterly not due for generation this period');
      await recordScheduleRun('quarterly', 'skipped', { triggerReason: 'not_scheduled' });
    }
    
    const duration = Date.now() - startTime.getTime();
    console.log(`✅ Weekly report generation completed in ${duration}ms`);
    console.log(`   Reports generated: ${generatedReports.length}`);
    console.log(`   Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Weekly report generation failed:', error);
    throw new ReportSchedulingError(
      `Schedule run failed: ${error}`, 
      'SCHEDULING_ERROR',
      { originalError: error }
    );
  }
}

/**
 * Starts the weekly report generation cron job
 */
export function startWeeklyReportSchedule(): void {
  if (activeJobs.has('weekly-reports')) {
    console.log('⚠️  Weekly report schedule already active');
    return;
  }
  
  const task = cron.schedule(WEEKLY_SCHEDULE, () => {
    executeWeeklyReportGeneration().catch(error => {
      console.error('🔥 Critical error in scheduled report generation:', error);
    });
  }, {
    scheduled: false,
    timezone: 'America/Mexico_City'
  });
  
  activeJobs.set('weekly-reports', task);
  task.start();
  
  console.log(`🚀 Weekly report schedule started`);
  console.log(`   Cron pattern: ${WEEKLY_SCHEDULE} (Mondays at 9:00 AM Mexico City time)`);
  console.log(`   OnePager: Generate on ${DEFAULT_CONFIG.onePagerDay}th of each month`);
  console.log(`   Quarterly: Generate on ${DEFAULT_CONFIG.quarterlyDay}th of quarter-end months`);
}

/**
 * Stops the weekly report generation cron job
 */
export function stopWeeklyReportSchedule(): void {
  const task = activeJobs.get('weekly-reports');
  if (task) {
    task.stop();
    activeJobs.delete('weekly-reports');
    console.log('🛑 Weekly report schedule stopped');
  } else {
    console.log('⚠️  No active weekly report schedule found');
  }
}

/**
 * Gets the status of active scheduled jobs
 */
export function getScheduleStatus(): {
  weeklyReports: {
    active: boolean;
    schedule: string;
    timezone: string;
  };
} {
  const weeklyTask = activeJobs.get('weekly-reports');
  
  return {
    weeklyReports: {
      active: weeklyTask !== undefined,
      schedule: WEEKLY_SCHEDULE,
      timezone: 'America/Mexico_City'
    }
  };
}

/**
 * Manually triggers report generation (for testing or manual runs)
 */
export async function manuallyTriggerReportGeneration(reportTypes?: ReportType[]): Promise<GeneratedReport[]> {
  console.log('🔧 Manually triggering report generation...');
  
  const typesToGenerate = reportTypes || (['onepager', 'quarterly'] as ReportType[]);
  const reports: GeneratedReport[] = [];
  
  for (const reportType of typesToGenerate) {
    try {
      const report = await generateScheduledReport(reportType);
      reports.push(report);
    } catch (error) {
      console.error(`Failed to generate ${reportType}:`, error);
      throw error;
    }
  }
  
  console.log(`✅ Manually generated ${reports.length} reports`);
  return reports;
}

// Auto-start scheduling in production
if (process.env.NODE_ENV === 'production') {
  startWeeklyReportSchedule();
}