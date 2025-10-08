-- ================================================================================================
-- Módulo G — Scheduling & Distribution de Reportes
-- ================================================================================================
-- Schema for automated report generation, distribution tracking, and audit trail
-- ================================================================================================

-- Generated Reports History with Integrity Tracking
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Report Classification
    type VARCHAR(20) NOT NULL CHECK (type IN ('onepager', 'quarterly')),
    period VARCHAR(10) NOT NULL, -- 'YYYY-MM' for monthly, 'YYYYQX' for quarterly
    
    -- File Storage & Integrity
    url TEXT NOT NULL,           -- Path to stored PDF file
    sha256 CHAR(64) NOT NULL,    -- SHA256 hash for integrity verification
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor VARCHAR(120) NOT NULL, -- Email of generator (user or 'cron')
    notes TEXT,                  -- Optional generation notes
    
    -- Distribution Tracking
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of delivered emails
    status VARCHAR(10) NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failed', 'pending')),
    
    -- Audit Fields
    delivered_at TIMESTAMPTZ,    -- When delivery was completed
    delivery_actor VARCHAR(120), -- Who initiated delivery
    delivery_notes TEXT,         -- Delivery-specific notes
    
    -- Indexes for common queries
    UNIQUE(type, period) -- One report per type per period
);

-- Index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON generated_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type_period ON generated_reports(type, period);
CREATE INDEX IF NOT EXISTS idx_generated_reports_status ON generated_reports(status);

-- Report Delivery Log for detailed audit trail
CREATE TABLE IF NOT EXISTS report_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES generated_reports(id) ON DELETE CASCADE,
    
    -- Delivery Details
    recipient_email VARCHAR(255) NOT NULL,
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('email', 's3', 'direct')),
    delivery_status VARCHAR(20) NOT NULL CHECK (delivery_status IN ('sent', 'failed', 'bounced')),
    
    -- Timestamps
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    
    -- Error Tracking
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    actor VARCHAR(120) NOT NULL,
    delivery_metadata JSONB DEFAULT '{}'::jsonb -- Provider-specific data
);

CREATE INDEX IF NOT EXISTS idx_report_deliveries_report_id ON report_deliveries(report_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_recipient ON report_deliveries(recipient_email);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_attempted_at ON report_deliveries(attempted_at DESC);

-- Cron Job Tracking for scheduling management
CREATE TABLE IF NOT EXISTS report_schedule_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job Details
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('onepager', 'quarterly', 'health_check')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    
    -- Results
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'skipped')),
    reports_generated INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    
    -- Execution Metadata
    execution_time_ms INTEGER,
    next_run_at TIMESTAMPTZ, -- When this job type should run next
    
    -- Context
    trigger_reason TEXT, -- 'scheduled', 'manual', 'retry', etc.
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_schedule_runs_job_type ON report_schedule_runs(job_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_runs_next_run ON report_schedule_runs(next_run_at) WHERE status = 'success';

-- ================================================================================================
-- Sample Data for Development
-- ================================================================================================

-- Insert sample generated reports for testing
INSERT INTO generated_reports (type, period, url, sha256, actor, notes, file_size_bytes, status, recipients) VALUES
(
    'onepager',
    '2025-09',
    '/tmp/reports/onepager_2025-09_20250930.pdf',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'cron@adaf.system',
    'Automated September monthly report',
    69420,
    'ok',
    '["investor-relations@adaf.com", "board@adaf.com"]'::jsonb
),
(
    'quarterly',
    '2025Q3',
    '/tmp/reports/quarterly_2025Q3_20250930.pdf',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    'compliance@adaf.com',
    'Q3 2025 comprehensive quarterly review for stakeholders',
    102400,
    'ok',
    '["regulatory@adaf.com", "audit@adaf.com", "cfo@adaf.com"]'::jsonb
),
(
    'onepager',
    '2025-08',
    '/tmp/reports/onepager_2025-08_20250831.pdf',
    'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    'portfolio-manager@adaf.com',
    'August performance summary for monthly board meeting',
    67890,
    'ok',
    '["board@adaf.com"]'::jsonb
)
ON CONFLICT (type, period) DO NOTHING;

-- Insert sample delivery records
INSERT INTO report_deliveries (report_id, recipient_email, delivery_method, delivery_status, actor, delivered_at) 
SELECT 
    r.id,
    'investor-relations@adaf.com',
    'email',
    'sent',
    'auto-delivery@adaf.system',
    r.created_at + INTERVAL '5 minutes'
FROM generated_reports r 
WHERE r.type = 'onepager' AND r.period = '2025-09'
ON CONFLICT DO NOTHING;

-- Insert sample schedule runs
INSERT INTO report_schedule_runs (job_type, scheduled_at, finished_at, status, reports_generated, execution_time_ms, next_run_at, trigger_reason) VALUES
(
    'onepager',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '45 seconds',
    'success',
    1,
    45230,
    date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', -- Last day of next month
    'scheduled'
),
(
    'quarterly',
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days' + INTERVAL '78 seconds',
    'success',
    1,
    78450,
    date_trunc('quarter', NOW()) + INTERVAL '3 months' - INTERVAL '1 day', -- Last day of next quarter
    'scheduled'
),
(
    'health_check',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour' + INTERVAL '2 seconds',
    'success',
    0,
    1850,
    NOW() + INTERVAL '23 hours', -- Daily health checks
    'scheduled'
);

-- ================================================================================================
-- Utility Views for Common Queries
-- ================================================================================================

-- Recent reports with delivery stats
CREATE OR REPLACE VIEW report_summary AS
SELECT 
    r.id,
    r.type,
    r.period,
    r.sha256,
    r.file_size_bytes,
    r.created_at,
    r.actor,
    r.status,
    jsonb_array_length(r.recipients) as recipient_count,
    COUNT(d.id) as delivery_attempts,
    COUNT(d.id) FILTER (WHERE d.delivery_status = 'sent') as successful_deliveries,
    MAX(d.delivered_at) as last_delivery_at
FROM generated_reports r
LEFT JOIN report_deliveries d ON r.id = d.report_id
GROUP BY r.id, r.type, r.period, r.sha256, r.file_size_bytes, r.created_at, r.actor, r.status, r.recipients
ORDER BY r.created_at DESC;

-- Health check view for dashboard
CREATE OR REPLACE VIEW report_health AS
SELECT
    MAX(CASE WHEN type = 'onepager' THEN created_at END) as last_onepager_at,
    MAX(CASE WHEN type = 'quarterly' THEN created_at END) as last_quarterly_at,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as reports_last_30d,
    COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '7 days') as failed_last_7d,
    AVG(file_size_bytes) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') as avg_file_size_90d
FROM generated_reports;

COMMENT ON TABLE generated_reports IS 'Módulo G: Automated report generation history with integrity tracking and distribution status';
COMMENT ON TABLE report_deliveries IS 'Módulo G: Detailed audit trail for report delivery attempts and results';
COMMENT ON TABLE report_schedule_runs IS 'Módulo G: Cron job execution tracking for automated report scheduling';
COMMENT ON VIEW report_summary IS 'Módulo G: Aggregated view of reports with delivery statistics for dashboard';
COMMENT ON VIEW report_health IS 'Módulo G: System health metrics for report generation monitoring';