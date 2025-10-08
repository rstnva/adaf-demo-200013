import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { 
  GeneratedReport, 
  ReportDelivery, 
  ReportScheduleRun
} from '@/types/scheduling';
import type { ReportType } from '@/types/reports';
import { 
  calculateSha256, 
  generateReportPath, 
  formatFileSize,
  getCurrentPeriodInfo
} from './scheduling-utils';

// ================================================================================================
// Módulo G — Report Storage & Integrity Management
// ================================================================================================
// Handles saving reports with SHA256 integrity checking and metadata tracking
// ================================================================================================

export interface SaveReportOptions {
  type: ReportType;
  period: string;
  pdfBuffer: Buffer;
  actor: string;
  notes?: string;
}

export interface SaveReportResult {
  success: boolean;
  report?: GeneratedReport;
  error?: string;
}

/**
 * Save PDF report with integrity hashing and metadata
 */
export async function saveReportWithIntegrity(options: SaveReportOptions): Promise<SaveReportResult> {
  try {
    const { type, period, pdfBuffer, actor, notes } = options;
    
    // Calculate SHA256 hash of PDF content
    const sha256 = calculateSha256(pdfBuffer);
    
    // Generate secure file path
    const reportPath = generateReportPath(type, period);
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Write PDF to disk
    fs.writeFileSync(reportPath, pdfBuffer);
    
    // Verify written file integrity
    const writtenBuffer = fs.readFileSync(reportPath);
    const verificationHash = calculateSha256(writtenBuffer);
    
    if (verificationHash !== sha256) {
      // Clean up corrupted file
      fs.unlinkSync(reportPath);
      throw new Error('File integrity check failed after write');
    }
    
    // Create report metadata
    const report: GeneratedReport = {
      id: crypto.randomUUID(),
      type,
      period,
      url: reportPath,
      sha256,
      fileSizeBytes: pdfBuffer.length,
      createdAt: new Date().toISOString(),
      actor,
      notes: notes || '',
      recipients: [],
      status: 'ok'
    };
    
    // In a real implementation, this would save to database
    // await db.insert('generated_reports', report);
    
    console.log(`[Storage] Saved ${type} report for ${period}: ${formatFileSize(pdfBuffer.length)} (${sha256.substring(0, 8)}...)`);
    
    return {
      success: true,
      report
    };
    
  } catch (error) {
    console.error('[Storage] Failed to save report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown storage error'
    };
  }
}

/**
 * Load and verify report integrity
 */
export async function loadReportWithVerification(reportId: string): Promise<{
  success: boolean;
  report?: GeneratedReport;
  pdfBuffer?: Buffer;
  integrityValid: boolean;
  error?: string;
}> {
  try {
    // In real implementation, load from database
    // const report = await db.findById('generated_reports', reportId);
    
    // For demo, create a mock report
    const mockReport: GeneratedReport = {
      id: reportId,
      type: 'onepager',
      period: '2025-09',
      url: '/tmp/reports/demo.pdf',
      sha256: 'mock-hash',
      fileSizeBytes: 69420,
      createdAt: new Date().toISOString(),
      actor: 'system@adaf.com',
      recipients: [],
      status: 'ok'
    };
    
    // Check if file exists
    if (!fs.existsSync(mockReport.url)) {
      return {
        success: false,
        integrityValid: false,
        error: 'Report file not found'
      };
    }
    
    // Load file and verify integrity
    const pdfBuffer = fs.readFileSync(mockReport.url);
    const actualHash = calculateSha256(pdfBuffer);
    const integrityValid = actualHash === mockReport.sha256;
    
    return {
      success: true,
      report: mockReport,
      pdfBuffer,
      integrityValid
    };
    
  } catch (error) {
    return {
      success: false,
      integrityValid: false,
      error: error instanceof Error ? error.message : 'Failed to load report'
    };
  }
}

/**
 * Enhanced PDF generation with automatic storage
 */
export async function generateAndStoreReport(
  type: ReportType,
  options: {
    actor: string;
    notes?: string;
    period?: string;
    quarter?: string;
  }
): Promise<SaveReportResult> {
  try {
    // Determine period if not provided
    let period = options.period;
    if (!period) {
      const periodInfo = getCurrentPeriodInfo();
      if (type === 'onepager') {
        period = periodInfo.period; // YYYY-MM
      } else {
        // For quarterly, derive from current date
        const now = new Date();
        const quarter = Math.ceil((now.getMonth() + 1) / 3);
        period = options.quarter || `${now.getFullYear()}Q${quarter}`;
      }
    }
    
    // In real implementation, this would call the PDF generation service
    // const generateEndpoint = `/api/generate/report/${type}`;
    // const generateBody = { actor, notes, ...(quarterly ? { quarter } : {}) };
    
    // For demo, create a mock PDF buffer
    const mockPdfContent = `Mock ${type} PDF for period ${period}`;
    const mockPdfBuffer = Buffer.from(mockPdfContent, 'utf-8');
    
    // Save with integrity checking
    return await saveReportWithIntegrity({
      type,
      period: period!,
      pdfBuffer: mockPdfBuffer,
      actor: options.actor,
      notes: options.notes
    });
    
  } catch (error) {
    console.error('[Storage] Generation and storage failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    };
  }
}

/**
 * Record successful delivery in audit trail
 */
export async function recordDelivery(
  reportId: string,
  recipientEmail: string,
  deliveryMethod: 'email' | 's3' | 'direct',
  actor: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    // Create delivery record for audit trail
    const deliveryRecord: ReportDelivery = {
      id: crypto.randomUUID(),
      reportId,
      recipientEmail,
      deliveryMethod,
      deliveryStatus: success ? 'sent' : 'failed',
      attemptedAt: new Date().toISOString(),
      deliveredAt: success ? new Date().toISOString() : undefined,
      errorMessage,
      retryCount: 0,
      actor,
      deliveryMetadata: {}
    };
    
    // In real implementation: await db.insert('report_deliveries', deliveryRecord);
    console.log(`[Delivery] Record created: ${deliveryRecord.id}`);
    console.log(`[Delivery] ${success ? 'Sent' : 'Failed'} ${deliveryMethod} delivery to ${recipientEmail} for report ${reportId}`);
    
  } catch (error) {
    console.error('[Delivery] Failed to record delivery:', error);
  }
}

/**
 * Record cron job execution
 */
export async function recordScheduleRun(
  jobType: 'onepager' | 'quarterly' | 'health_check',
  status: 'running' | 'success' | 'failed' | 'skipped',
  options: {
    reportsGenerated?: number;
    executionTimeMs?: number;
    errorMessage?: string;
    triggerReason?: string;
  } = {}
): Promise<void> {
  try {
    const scheduleRun: ReportScheduleRun = {
      id: crypto.randomUUID(),
      jobType,
      scheduledAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishedAt: status !== 'running' ? new Date().toISOString() : undefined,
      status,
      reportsGenerated: options.reportsGenerated || 0,
      errorMessage: options.errorMessage,
      executionTimeMs: options.executionTimeMs,
      nextRunAt: undefined, // Would be calculated based on schedule
      triggerReason: options.triggerReason || 'scheduled',
      metadata: {}
    };
    
    // In real implementation: await db.insert('report_schedule_runs', scheduleRun);
    console.log(`[Schedule] Run recorded: ${scheduleRun.id}`);
    console.log(`[Schedule] ${jobType} job ${status}: ${options.reportsGenerated || 0} reports generated`);
    
  } catch (error) {
    console.error('[Schedule] Failed to record run:', error);
  }
}

/**
 * Clean up old report files based on retention policy
 */
export async function cleanupOldReports(retentionDays = 180): Promise<{
  deletedCount: number;
  spaceFreedBytes: number;
}> {
  try {
    const reportsDir = process.env.REPORTS_STORAGE_PATH || '/tmp/reports';
    
    if (!fs.existsSync(reportsDir)) {
      return { deletedCount: 0, spaceFreedBytes: 0 };
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let deletedCount = 0;
    let spaceFreedBytes = 0;
    
    const files = fs.readdirSync(reportsDir);
    
    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate && file.endsWith('.pdf')) {
        spaceFreedBytes += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
        
        console.log(`[Cleanup] Deleted old report: ${file} (${formatFileSize(stats.size)})`);
      }
    }
    
    console.log(`[Cleanup] Removed ${deletedCount} old reports, freed ${formatFileSize(spaceFreedBytes)}`);
    
    return { deletedCount, spaceFreedBytes };
    
  } catch (error) {
    console.error('[Cleanup] Failed to clean up old reports:', error);
    return { deletedCount: 0, spaceFreedBytes: 0 };
  }
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  totalFiles: number;
  totalSizeBytes: number;
  oldestReport?: string;
  newestReport?: string;
} {
  try {
    const reportsDir = process.env.REPORTS_STORAGE_PATH || '/tmp/reports';
    
    if (!fs.existsSync(reportsDir)) {
      return { totalFiles: 0, totalSizeBytes: 0 };
    }
    
    const files = fs.readdirSync(reportsDir);
    let totalSizeBytes = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    let oldestFile = '';
    let newestFile = '';
    
    for (const file of files) {
      if (!file.endsWith('.pdf')) continue;
      
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);
      
      totalSizeBytes += stats.size;
      
      if (stats.mtime.getTime() < oldestTime) {
        oldestTime = stats.mtime.getTime();
        oldestFile = file;
      }
      
      if (stats.mtime.getTime() > newestTime) {
        newestTime = stats.mtime.getTime();
        newestFile = file;
      }
    }
    
    return {
      totalFiles: files.filter(f => f.endsWith('.pdf')).length,
      totalSizeBytes,
      oldestReport: oldestFile || undefined,
      newestReport: newestFile || undefined
    };
    
  } catch (error) {
    console.error('[Storage] Failed to get stats:', error);
    return { totalFiles: 0, totalSizeBytes: 0 };
  }
}