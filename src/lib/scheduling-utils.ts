import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { 
  PeriodInfo, 
  ScheduleConfig,
  GeneratedReport
} from '@/types/scheduling';
import type { ReportType } from '@/types/reports';

// ================================================================================================
// Módulo G — Scheduling Utilities
// ================================================================================================
// Core utilities for report scheduling, period calculation, file integrity, and validation
// ================================================================================================

/**
 * Get current period information and scheduling details
 */
export function getCurrentPeriodInfo(): PeriodInfo {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const quarter = Math.ceil(month / 3);
  
  // Current month period (YYYY-MM)
  const monthPeriod = `${year}-${month.toString().padStart(2, '0')}`;
  
  // Current quarter period (YYYYQX) - for reference
  // const quarterPeriod = `${year}Q${quarter}`;
  
  // Check if we're at month end (within last 3 days of month)
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const daysFromEnd = lastDayOfMonth - now.getDate();
  const isMonthEnd = daysFromEnd <= 2;
  
  // Check if we're at quarter end
  const quarterEndMonths = [3, 6, 9, 12];
  const isQuarterEnd = quarterEndMonths.includes(month) && isMonthEnd;
  
  // Calculate next generation dates
  const nextMonth = new Date(year, month, 0); // Last day of current month
  const nextQuarter = new Date(year, quarter * 3, 0); // Last day of current quarter
  
  return {
    period: monthPeriod,
    isMonthEnd,
    isQuarterEnd,
    nextOnePagerDate: nextMonth,
    nextQuarterlyDate: nextQuarter
  };
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Calculate SHA256 hash of buffer
 */
export function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Calculate SHA256 hash of file
 */
export function calculateFileSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return calculateSha256(buffer);
}

/**
 * Format period for display
 */
export function formatPeriodDisplay(period: string): string {
  if (period.includes('Q')) {
    // Quarterly format: 2025Q3 -> "Q3 2025"
    const [year, quarter] = period.split('Q');
    return `Q${quarter} ${year}`;
  } else {
    // Monthly format: 2025-09 -> "September 2025"
    const [year, month] = period.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }
}

/**
 * Check if it's time to generate a specific report type
 */
export function shouldGenerateReport(type: ReportType, config: ScheduleConfig): boolean {
  if (!config.enableAutoGeneration) {
    return false;
  }
  
  const periodInfo = getCurrentPeriodInfo();
  const now = new Date();
  
  if (type === 'onepager') {
    // Generate on specified day of month (or last day if > days in month)
    const targetDay = config.onePagerDay === -1 ? 
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : 
      Math.min(config.onePagerDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
    
    return now.getDate() === targetDay && periodInfo.isMonthEnd;
  }
  
  if (type === 'quarterly') {
    // Generate on specified day of quarter-end month
    const quarterEndMonths = [3, 6, 9, 12];
    const isQuarterEndMonth = quarterEndMonths.includes(now.getMonth() + 1);
    
    if (!isQuarterEndMonth) return false;
    
    const targetDay = config.quarterlyDay === -1 ?
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() :
      Math.min(config.quarterlyDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
    
    return now.getDate() === targetDay && periodInfo.isQuarterEnd;
  }
  
  return false;
}

/**
 * Sanitize and validate recipient email list
 */
export function sanitizeRecipients(recipients: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  // Remove duplicates and validate
  const uniqueRecipients = [...new Set(recipients.map(r => r.trim().toLowerCase()))];
  
  for (const recipient of uniqueRecipients) {
    if (isValidEmail(recipient)) {
      valid.push(recipient);
    } else {
      invalid.push(recipient);
    }
  }
  
  return { valid, invalid };
}

/**
 * Generate standardized filename for reports
 */
export function generateReportFilename(type: ReportType, period: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${type}_${period}_${timestamp}.pdf`;
}

/**
 * Generate secure file path for storing reports
 */
export function generateReportPath(type: ReportType, period: string): string {
  const filename = generateReportFilename(type, period);
  const reportsDir = process.env.REPORTS_STORAGE_PATH || '/tmp/reports';
  
  // Ensure directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  return path.join(reportsDir, filename);
}

/**
 * Verify file integrity against stored hash
 */
export function verifyReportIntegrity(report: GeneratedReport): {
  isValid: boolean;
  actualSha256: string;
  expectedSha256: string;
  fileExists: boolean;
} {
  try {
    const fileExists = fs.existsSync(report.url);
    if (!fileExists) {
      return {
        isValid: false,
        actualSha256: '',
        expectedSha256: report.sha256,
        fileExists: false
      };
    }
    
    const actualSha256 = calculateFileSha256(report.url);
    const isValid = actualSha256 === report.sha256;
    
    return {
      isValid,
      actualSha256,
      expectedSha256: report.sha256,
      fileExists: true
    };
  } catch (error) {
    return {
      isValid: false,
      actualSha256: '',
      expectedSha256: report.sha256,
      fileExists: false
    };
  }
}

/**
 * Parse period string to get date components
 */
export function parsePeriod(period: string): {
  year: number;
  month?: number;
  quarter?: number;
  type: 'monthly' | 'quarterly';
} {
  if (period.includes('Q')) {
    // Quarterly: 2025Q3
    const [year, quarter] = period.split('Q');
    return {
      year: parseInt(year),
      quarter: parseInt(quarter),
      type: 'quarterly'
    };
  } else {
    // Monthly: 2025-09
    const [year, month] = period.split('-');
    return {
      year: parseInt(year),
      month: parseInt(month),
      type: 'monthly'
    };
  }
}

/**
 * Get default schedule configuration
 */
export function getDefaultScheduleConfig(): ScheduleConfig {
  return {
    enableAutoGeneration: true,
    
    // Generate OnePager on last day of month at 18:00 UTC
    onePagerDay: -1,
    onePagerTime: '18:00',
    
    // Generate Quarterly on last day of quarter at 20:00 UTC
    quarterlyDay: -1,
    quarterlyTime: '20:00',
    
    // Auto-delivery disabled by default for security
    autoDelivery: false,
    defaultRecipients: {
      onepager: [],
      quarterly: []
    },
    
    // Retry settings
    maxRetries: 3,
    retryDelayMinutes: 30
  };
}

/**
 * Check if current time matches schedule for report type
 */
export function isScheduledTime(type: ReportType, config: ScheduleConfig): boolean {
  const now = new Date();
  const targetTime = type === 'onepager' ? config.onePagerTime : config.quarterlyTime;
  
  // Allow 5-minute window around scheduled time
  const [targetHour, targetMinute] = targetTime.split(':').map(Number);
  const targetDate = new Date(now);
  targetDate.setHours(targetHour, targetMinute, 0, 0);
  
  const diffMinutes = Math.abs(now.getTime() - targetDate.getTime()) / (1000 * 60);
  
  return diffMinutes <= 5;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Truncate SHA256 hash for display
 */
export function truncateSha256(hash: string, length = 8): string {
  return hash.substring(0, length) + '...';
}

/**
 * Generate next run time for cron job
 */
export function calculateNextRunTime(type: ReportType, config: ScheduleConfig): Date {
  const now = new Date();
  let nextRun: Date;
  
  if (type === 'onepager') {
    // Next month end
    nextRun = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const [hour, minute] = config.onePagerTime.split(':').map(Number);
    nextRun.setHours(hour, minute, 0, 0);
  } else {
    // Next quarter end
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
    const nextYear = currentQuarter === 4 ? now.getFullYear() + 1 : now.getFullYear();
    
    nextRun = new Date(nextYear, nextQuarter * 3, 0); // Last day of quarter
    const [hour, minute] = config.quarterlyTime.split(':').map(Number);
    nextRun.setHours(hour, minute, 0, 0);
  }
  
  return nextRun;
}