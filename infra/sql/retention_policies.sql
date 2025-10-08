-- ================================================================================================
-- Data Retention and Archiving Policies
-- ================================================================================================
-- SQL policies for automated data retention and archiving in ADAF Dashboard
-- Implements tiered retention: compress → archive → purge based on data age and importance
-- ================================================================================================

-- =============================================================================
-- Signals Table Retention (365 days)
-- =============================================================================

-- Archive signals older than 90 days (compress to daily aggregates)
CREATE OR REPLACE FUNCTION archive_old_signals()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
    cutoff_date TIMESTAMP := NOW() - INTERVAL '90 days';
    purge_date TIMESTAMP := NOW() - INTERVAL '365 days';
BEGIN
    -- First, create daily aggregates for signals between 90-365 days
    INSERT INTO signals_archive (
        date_bucket,
        agent,
        signal_count,
        avg_confidence,
        max_severity,
        created_at
    )
    SELECT 
        DATE_TRUNC('day', ts) as date_bucket,
        agent,
        COUNT(*) as signal_count,
        AVG(CAST(metadata->>'confidence' AS FLOAT)) as avg_confidence,
        MAX(severity) as max_severity,
        NOW() as created_at
    FROM signals 
    WHERE ts >= purge_date AND ts < cutoff_date
    GROUP BY DATE_TRUNC('day', ts), agent
    ON CONFLICT (date_bucket, agent) DO NOTHING;

    -- Delete original detailed signals older than 90 days but keep < 365 days (now archived)
    DELETE FROM signals 
    WHERE ts >= purge_date AND ts < cutoff_date;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Purge signals older than 365 days (including archives)
    DELETE FROM signals_archive WHERE date_bucket < purge_date;
    DELETE FROM signals WHERE ts < purge_date;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Lineage Events Retention (365 days)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_lineage_events()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
    purge_date TIMESTAMP := NOW() - INTERVAL '365 days';
BEGIN
    -- Delete lineage events older than 365 days
    DELETE FROM lineage_events 
    WHERE created_at < purge_date;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Alerts Retention (3 years)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
    archive_date TIMESTAMP := NOW() - INTERVAL '1 year';
    purge_date TIMESTAMP := NOW() - INTERVAL '3 years';
BEGIN
    -- Archive alerts older than 1 year to compressed format
    INSERT INTO alerts_archive (
        date_bucket,
        severity,
        alert_count,
        avg_response_time_minutes,
        created_at
    )
    SELECT 
        DATE_TRUNC('week', created_at) as date_bucket,
        severity,
        COUNT(*) as alert_count,
        AVG(EXTRACT(EPOCH FROM (acked_at - created_at))/60) as avg_response_time_minutes,
        NOW() as created_at
    FROM alerts 
    WHERE created_at >= purge_date AND created_at < archive_date
    AND acked_at IS NOT NULL
    GROUP BY DATE_TRUNC('week', created_at), severity
    ON CONFLICT (date_bucket, severity) DO NOTHING;

    -- Delete original alerts that are now archived
    DELETE FROM alerts 
    WHERE created_at >= purge_date AND created_at < archive_date;
    
    -- Purge very old alerts (> 3 years)
    DELETE FROM alerts WHERE created_at < purge_date;
    DELETE FROM alerts_archive WHERE date_bucket < purge_date;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Opportunities Retention (5 years)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_opportunities()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
    purge_date TIMESTAMP := NOW() - INTERVAL '5 years';
BEGIN
    -- Keep opportunities for 5 years due to regulatory requirements
    -- Only purge extremely old records
    DELETE FROM opportunities 
    WHERE created_at < purge_date;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Generated Reports Retention (5 years)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_reports()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
    purge_date TIMESTAMP := NOW() - INTERVAL '5 years';
BEGIN
    -- Keep reports for 5 years for compliance
    DELETE FROM generated_reports 
    WHERE created_at < purge_date;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Backtests Retention (Compress old results)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_backtests()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER := 0;
    compress_date TIMESTAMP := NOW() - INTERVAL '24 months';
    purge_date TIMESTAMP := NOW() - INTERVAL '5 years';
BEGIN
    -- For backtests older than 24 months, compress equity series to monthly aggregates
    UPDATE backtests 
    SET results = jsonb_set(
        results,
        '{equity}',
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', DATE_TRUNC('month', (equity->>'date')::timestamp),
                    'value', AVG((equity->>'value')::float),
                    'drawdown', MAX((equity->>'drawdown')::float)
                )
            )
            FROM jsonb_array_elements(results->'equity') as equity
            GROUP BY DATE_TRUNC('month', (equity->>'date')::timestamp)
        )
    )
    WHERE created_at < compress_date 
    AND results ? 'equity' 
    AND jsonb_array_length(results->'equity') > 24; -- Only compress if more than 24 data points
    
    -- Purge very old backtests (keep config and summary KPIs)
    UPDATE backtests 
    SET results = jsonb_build_object(
        'kpis', results->'kpis',
        'summary', results->'summary',
        'compressed', true
    )
    WHERE created_at < purge_date AND results IS NOT NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Master Retention Job Function
-- =============================================================================

CREATE OR REPLACE FUNCTION run_retention_policies()
RETURNS TABLE (
    policy_name TEXT,
    rows_affected INTEGER,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration_ms INTEGER;
    rows_count INTEGER;
BEGIN
    -- Signals retention
    start_time := clock_timestamp();
    BEGIN
        SELECT archive_old_signals() INTO rows_count;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        
        RETURN QUERY SELECT 'signals_retention'::TEXT, rows_count, duration_ms, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'signals_retention'::TEXT, 0, 0, false, SQLERRM;
    END;

    -- Lineage events retention
    start_time := clock_timestamp();
    BEGIN
        SELECT cleanup_lineage_events() INTO rows_count;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        
        RETURN QUERY SELECT 'lineage_events_retention'::TEXT, rows_count, duration_ms, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'lineage_events_retention'::TEXT, 0, 0, false, SQLERRM;
    END;

    -- Alerts retention
    start_time := clock_timestamp();
    BEGIN
        SELECT cleanup_old_alerts() INTO rows_count;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        
        RETURN QUERY SELECT 'alerts_retention'::TEXT, rows_count, duration_ms, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'alerts_retention'::TEXT, 0, 0, false, SQLERRM;
    END;

    -- Opportunities retention
    start_time := clock_timestamp();
    BEGIN
        SELECT cleanup_old_opportunities() INTO rows_count;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        
        RETURN QUERY SELECT 'opportunities_retention'::TEXT, rows_count, duration_ms, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'opportunities_retention'::TEXT, 0, 0, false, SQLERRM;
    END;

    -- Reports retention
    start_time := clock_timestamp();
    BEGIN
        SELECT cleanup_old_reports() INTO rows_count;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        
        RETURN QUERY SELECT 'reports_retention'::TEXT, rows_count, duration_ms, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'reports_retention'::TEXT, 0, 0, false, SQLERRM;
    END;

    -- Backtests retention
    start_time := clock_timestamp();
    BEGIN
        SELECT cleanup_old_backtests() INTO rows_count;
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        
        RETURN QUERY SELECT 'backtests_retention'::TEXT, rows_count, duration_ms, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'backtests_retention'::TEXT, 0, 0, false, SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Archive Tables (create if not exist)
-- =============================================================================

-- Signals archive table
CREATE TABLE IF NOT EXISTS signals_archive (
    id SERIAL PRIMARY KEY,
    date_bucket DATE NOT NULL,
    agent VARCHAR(50) NOT NULL,
    signal_count INTEGER NOT NULL,
    avg_confidence FLOAT,
    max_severity VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date_bucket, agent)
);

-- Alerts archive table
CREATE TABLE IF NOT EXISTS alerts_archive (
    id SERIAL PRIMARY KEY,
    date_bucket DATE NOT NULL,
    severity VARCHAR(20) NOT NULL,
    alert_count INTEGER NOT NULL,
    avg_response_time_minutes FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date_bucket, severity)
);

-- Create indexes for archive tables
CREATE INDEX IF NOT EXISTS idx_signals_archive_date_bucket ON signals_archive(date_bucket);
CREATE INDEX IF NOT EXISTS idx_alerts_archive_date_bucket ON alerts_archive(date_bucket);

-- =============================================================================
-- Retention Policies Configuration
-- =============================================================================

COMMENT ON FUNCTION run_retention_policies() IS 'Master retention job that runs all data retention policies with error handling and logging';
COMMENT ON FUNCTION archive_old_signals() IS 'Archives signals older than 90 days to daily aggregates, purges signals older than 365 days';
COMMENT ON FUNCTION cleanup_lineage_events() IS 'Purges lineage events older than 365 days';
COMMENT ON FUNCTION cleanup_old_alerts() IS 'Archives alerts older than 1 year, purges alerts older than 3 years';
COMMENT ON FUNCTION cleanup_old_opportunities() IS 'Purges opportunities older than 5 years (regulatory compliance)';
COMMENT ON FUNCTION cleanup_old_reports() IS 'Purges generated reports older than 5 years (regulatory compliance)';
COMMENT ON FUNCTION cleanup_old_backtests() IS 'Compresses backtest results older than 24 months, keeps summary data for 5 years';