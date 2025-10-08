// ================================================================================================
// Módulo G — Scheduling & Distribution Types
// ================================================================================================
// TypeScript definitions for automated report scheduling, distribution, and audit trail
// ================================================================================================

import { type ReportType } from './reports';

// =============================================================================
// Database Entity Types
// =============================================================================

export interface GeneratedReport {
  id: string;
  
  // Report Classification
  type: ReportType;
  period: string;           // 'YYYY-MM' | 'YYYYQX'
  
  // File Storage & Integrity
  url: string;              // Path to stored PDF
  sha256: string;           // SHA256 hash for verification
  fileSizeBytes: number;
  
  // Metadata
  createdAt: string;        // ISO timestamp
  actor: string;            // Generator email or 'cron'
  notes?: string;
  
  // Distribution Tracking
  recipients: string[];     // Array of delivered emails
  status: 'ok' | 'failed' | 'pending';
  
  // Audit Fields
  deliveredAt?: string;     // ISO timestamp
  deliveryActor?: string;   // Who initiated delivery
  deliveryNotes?: string;
}

export interface ReportDelivery {
  id: string;
  reportId: string;
  
  // Delivery Details
  recipientEmail: string;
  deliveryMethod: 'email' | 's3' | 'direct';
  deliveryStatus: 'sent' | 'failed' | 'bounced';
  
  // Timestamps
  attemptedAt: string;
  deliveredAt?: string;
  
  // Error Tracking
  errorMessage?: string;
  retryCount: number;
  
  // Metadata
  actor: string;
  deliveryMetadata: Record<string, unknown>;
}

export interface ReportScheduleRun {
  id: string;
  
  // Job Details
  jobType: 'onepager' | 'quarterly' | 'health_check';
  scheduledAt: string;
  startedAt: string;
  finishedAt?: string;
  
  // Results
  status: 'running' | 'success' | 'failed' | 'skipped';
  reportsGenerated: number;
  errorMessage?: string;
  
  // Execution Metadata
  executionTimeMs?: number;
  nextRunAt?: string;
  
  // Context
  triggerReason: string;    // 'scheduled' | 'manual' | 'retry'
  metadata: Record<string, unknown>;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface DeliverReportRequest {
  reportId: string;
  recipients: string[];     // Array of email addresses
  actor: string;
  notes?: string;
  deliveryMethod?: 'email' | 's3';
}

export interface DeliverReportResponse {
  success: boolean;
  deliveryId?: string;
  deliveredCount: number;
  failedCount: number;
  errors?: Array<{
    recipient: string;
    error: string;
  }>;
}

export interface ReportHistoryQuery {
  limit?: number;           // Default 50
  offset?: number;          // For pagination
  type?: ReportType;        // Filter by report type
  period?: string;          // Filter by specific period
  status?: string;          // Filter by status
  actor?: string;           // Filter by generator
}

export interface ReportHistoryResponse {
  reports: Array<GeneratedReport & {
    deliveryAttempts: number;
    successfulDeliveries: number;
    lastDeliveryAt?: string;
  }>;
  total: number;
  hasMore: boolean;
}

export interface ReportHealthResponse {
  lastOnePagerAt?: string;
  lastQuarterlyAt?: string;
  reportsLast30d: number;
  failedLast7d: number;
  avgFileSizeBytes: number;
  
  // Health Status Indicators
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
}

// =============================================================================
// Scheduling & Cron Types
// =============================================================================

export interface ScheduleConfig {
  enableAutoGeneration: boolean;
  
  // OnePager Schedule (monthly)
  onePagerDay: number;      // Day of month (1-31, or -1 for last day)
  onePagerTime: string;     // HH:mm in UTC
  
  // Quarterly Schedule
  quarterlyDay: number;     // Day of quarter end month
  quarterlyTime: string;    // HH:mm in UTC
  
  // Delivery Settings
  autoDelivery: boolean;
  defaultRecipients: {
    onepager: string[];
    quarterly: string[];
  };
  
  // Retry Settings
  maxRetries: number;
  retryDelayMinutes: number;
}

export interface CronJobStatus {
  jobType: string;
  lastRun?: string;
  nextRun?: string;
  status: 'scheduled' | 'running' | 'failed' | 'disabled';
  consecutiveFailures: number;
  lastError?: string;
}

// =============================================================================
// Distribution & Delivery Types
// =============================================================================

export interface EmailDeliveryConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;     // From vault/env
  fromEmail: string;
  fromName: string;
  
  // Templates
  onePagerSubject: string;
  quarterlySubject: string;
  emailTemplate: string;    // HTML template path
}

export interface S3DeliveryConfig {
  enabled: boolean;
  bucketName: string;
  region: string;
  accessKeyId: string;      // From vault/env
  secretAccessKey: string;  // From vault/env
  
  // URL Settings
  urlExpirationHours: number; // Default 72 hours
  pathPrefix: string;       // 'reports/' for organization
}

export interface DeliveryProvider {
  type: 'email' | 's3';
  name: string;
  enabled: boolean;
  config: EmailDeliveryConfig | S3DeliveryConfig;
}

// =============================================================================
// Validation & Business Logic Types
// =============================================================================

export interface PeriodInfo {
  period: string;           // 'YYYY-MM' | 'YYYYQX'
  isMonthEnd: boolean;
  isQuarterEnd: boolean;
  nextOnePagerDate: Date;
  nextQuarterlyDate: Date;
}

export interface ReportIntegrityCheck {
  reportId: string;
  expectedSha256: string;
  actualSha256: string;
  fileSizeBytes: number;
  isValid: boolean;
  checkedAt: string;
}

// =============================================================================
// Utility Function Types
// =============================================================================

export type GetCurrentPeriodInfo = () => PeriodInfo;
export type IsValidEmail = (email: string) => boolean;
export type CalculateSha256 = (buffer: Buffer) => string;
export type FormatPeriodDisplay = (period: string) => string;
export type ShouldGenerateReport = (type: ReportType, config: ScheduleConfig) => boolean;
export type SanitizeRecipients = (recipients: string[]) => {
  valid: string[];
  invalid: string[];
};
export type GenerateReportFilename = (type: ReportType, period: string) => string;

// =============================================================================
// Error Types for Scheduling & Distribution
// =============================================================================

export class ReportSchedulingError extends Error {
  constructor(
    message: string,
    public code: 'GENERATION_FAILED' | 'SCHEDULING_ERROR' | 'CONFIG_INVALID',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ReportSchedulingError';
  }
}

export class ReportDeliveryError extends Error {
  constructor(
    message: string,
    public code: 'EMAIL_FAILED' | 'S3_FAILED' | 'INVALID_RECIPIENTS' | 'FILE_NOT_FOUND',
    public recipients?: string[],
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ReportDeliveryError';
  }
}

// =============================================================================
// Metrics & Observability Types
// =============================================================================

export interface ReportMetrics {
  // Generation Metrics
  reportsGeneratedTotal: Record<ReportType, number>;
  generationDurationMs: Array<{ type: ReportType; duration: number; timestamp: string }>;
  generationErrorsTotal: Record<string, number>; // By error type
  
  // Delivery Metrics
  deliveryAttemptsTotal: Record<'email' | 's3', number>;
  deliverySuccessTotal: Record<'email' | 's3', number>;
  deliveryFailuresTotal: Record<string, number>; // By failure reason
  
  // Health Metrics
  lastSuccessfulGeneration: Record<ReportType, string>;
  avgFileSizeBytes: Record<ReportType, number>;
  schedulingHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export type SchedulingEventType = 
  | 'report_generated'
  | 'report_delivery_attempt'
  | 'report_delivery_success'
  | 'report_delivery_failure'
  | 'schedule_run_start'
  | 'schedule_run_complete'
  | 'schedule_run_failed';

export interface SchedulingEvent {
  type: SchedulingEventType;
  reportId?: string;
  actor: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}