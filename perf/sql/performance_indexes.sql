-- ADAF Dashboard Performance Optimization Indexes
-- 
-- This file contains database indexes designed to optimize query performance
-- for the most frequently accessed data patterns in the ADAF Dashboard.
--
-- Implementation Instructions:
-- 1. Run in a maintenance window or during low-traffic periods
-- 2. Use CONCURRENTLY option to avoid blocking existing operations  
-- 3. Monitor index creation progress and system resources
-- 4. Validate performance improvements after implementation
--
-- Target Performance Improvements:
-- - 60% reduction in p95 query execution time
-- - 50% reduction in database CPU utilization during peak hours
-- - Improved concurrent query throughput

-- =============================================================================
-- STRATEGY DATA PERFORMANCE INDEXES
-- =============================================================================

-- Primary strategy data access pattern: symbol + timestamp queries
-- Common query: SELECT * FROM strategy_data WHERE symbol = ? AND timestamp >= ? ORDER BY timestamp DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategy_data_symbol_timestamp
    ON strategy_data(symbol, timestamp DESC)
    WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days';

-- Strategy performance aggregation queries  
-- Common query: SELECT * FROM strategy_performance WHERE strategy_type = ? AND date >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategy_performance_type_date
    ON strategy_performance(strategy_type, date DESC)
    INCLUDE (total_return, sharpe_ratio, max_drawdown);

-- Strategy backtests with parameters
-- Common query: SELECT * FROM strategy_backtests WHERE strategy_id = ? AND parameters = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategy_backtests_id_params
    ON strategy_backtests(strategy_id, parameters)
    WHERE status = 'completed';

-- Multi-strategy comparison queries
-- Common query: SELECT * FROM strategy_metrics WHERE symbol IN (...) AND metric_date >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategy_metrics_symbol_date
    ON strategy_metrics(symbol, metric_date DESC)
    INCLUDE (return_1d, return_7d, return_30d, volatility);

-- =============================================================================
-- PORTFOLIO PERFORMANCE INDEXES  
-- =============================================================================

-- User portfolio positions (most frequent query pattern)
-- Common query: SELECT * FROM portfolio_positions WHERE user_id = ? AND date >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_positions_user_date
    ON portfolio_positions(user_id, date DESC)
    INCLUDE (asset_symbol, quantity, market_value, unrealized_pnl);

-- Portfolio transaction history
-- Common query: SELECT * FROM transactions WHERE user_id = ? AND timestamp >= ? ORDER BY timestamp DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_timestamp  
    ON transactions(user_id, timestamp DESC)
    INCLUDE (transaction_type, asset_symbol, quantity, price);

-- Asset-specific portfolio analytics
-- Common query: SELECT * FROM portfolio_analytics WHERE user_id = ? AND asset_symbol = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_analytics_user_asset
    ON portfolio_analytics(user_id, asset_symbol)
    INCLUDE (allocation_percent, risk_contribution, expected_return);

-- Portfolio performance attribution
-- Common query: SELECT * FROM performance_attribution WHERE user_id = ? AND date BETWEEN ? AND ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_attribution_user_date_range
    ON performance_attribution(user_id, date DESC)
    WHERE date >= CURRENT_DATE - INTERVAL '365 days';

-- =============================================================================
-- MARKET DATA PERFORMANCE INDEXES
-- =============================================================================

-- Real-time and historical market data access
-- Common query: SELECT * FROM market_data WHERE symbol = ? AND date >= ? ORDER BY date DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_data_symbol_date
    ON market_data(symbol, date DESC)
    INCLUDE (open_price, high_price, low_price, close_price, volume)
    WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Intraday market data for charts and analysis
-- Common query: SELECT * FROM intraday_data WHERE symbol = ? AND datetime >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intraday_data_symbol_datetime
    ON intraday_data(symbol, datetime DESC)
    INCLUDE (price, volume)
    WHERE datetime >= CURRENT_DATE - INTERVAL '7 days';

-- Market data aggregations for reporting
-- Common query: SELECT symbol, AVG(close_price) FROM market_data WHERE date BETWEEN ? AND ? GROUP BY symbol
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_data_date_symbol
    ON market_data(date DESC, symbol)
    INCLUDE (close_price, volume)
    WHERE date >= CURRENT_DATE - INTERVAL '365 days';

-- Cross-asset correlation analysis
-- Common query: SELECT * FROM correlation_matrix WHERE symbol_pair IN (...) AND calculation_date = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_correlation_matrix_symbols_date
    ON correlation_matrix(symbol_a, symbol_b, calculation_date DESC)
    INCLUDE (correlation_coefficient, p_value);

-- =============================================================================
-- REPORTING AND ANALYTICS INDEXES
-- =============================================================================

-- Daily performance metrics aggregation
-- Common query: SELECT * FROM daily_performance WHERE metric_date >= ? ORDER BY metric_date DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_performance_date
    ON daily_performance(metric_date DESC)
    INCLUDE (total_aum, total_pnl, active_strategies, active_users);

-- User activity and engagement metrics  
-- Common query: SELECT * FROM user_activity WHERE user_id = ? AND activity_date >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_user_date
    ON user_activity(user_id, activity_date DESC)
    INCLUDE (session_duration, pages_viewed, actions_performed);

-- Risk metrics and compliance reporting
-- Common query: SELECT * FROM risk_metrics WHERE metric_type = ? AND calculation_date >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_metrics_type_date
    ON risk_metrics(metric_type, calculation_date DESC)
    INCLUDE (metric_value, threshold_value, breach_status);

-- Audit trail for compliance
-- Common query: SELECT * FROM audit_log WHERE user_id = ? AND action_timestamp >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_timestamp
    ON audit_log(user_id, action_timestamp DESC)
    INCLUDE (action_type, table_name, record_id);

-- =============================================================================
-- SYSTEM PERFORMANCE INDEXES
-- =============================================================================

-- Application session management
-- Common query: SELECT * FROM user_sessions WHERE session_id = ? AND expires_at > NOW()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_id_expires
    ON user_sessions(session_id)
    WHERE expires_at > NOW();

-- API request logging and rate limiting
-- Common query: SELECT COUNT(*) FROM api_requests WHERE user_id = ? AND request_timestamp >= ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_requests_user_timestamp
    ON api_requests(user_id, request_timestamp DESC)
    WHERE request_timestamp >= NOW() - INTERVAL '1 hour';

-- Background job processing  
-- Common query: SELECT * FROM job_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_queue_status_priority_created
    ON job_queue(status, priority DESC, created_at ASC)
    WHERE status IN ('pending', 'processing');

-- System notifications and alerts
-- Common query: SELECT * FROM notifications WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created
    ON notifications(user_id, created_at DESC)
    WHERE read_at IS NULL OR created_at >= NOW() - INTERVAL '30 days';

-- =============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================================================

-- Dashboard overview query optimization
-- Common query: Complex join between portfolios, strategies, and market data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_composite_user_date
    ON portfolio_positions(user_id, date DESC, asset_symbol)
    INCLUDE (market_value, unrealized_pnl, allocation_percent);

-- Strategy comparison and ranking
-- Common query: SELECT strategy_type, symbol, AVG(return_1d) FROM strategy_metrics WHERE date >= ? GROUP BY strategy_type, symbol
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategy_comparison_type_symbol_date
    ON strategy_metrics(strategy_type, symbol, metric_date DESC)
    INCLUDE (return_1d, return_7d, return_30d, sharpe_ratio);

-- Risk management dashboard
-- Common query: Portfolio risk aggregation across multiple dimensions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_dashboard_user_date_asset
    ON portfolio_risk_metrics(user_id, calculation_date DESC, asset_category)
    INCLUDE (var_1d, var_5d, expected_shortfall, beta);

-- =============================================================================
-- PARTIAL INDEXES FOR DATA ARCHIVAL OPTIMIZATION
-- =============================================================================

-- Active data only (last 90 days) for frequently accessed tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategy_data_recent_symbol_timestamp
    ON strategy_data(symbol, timestamp DESC)
    WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_data_recent_symbol_date  
    ON market_data(symbol, date DESC)
    WHERE date >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_positions_recent_user_date
    ON portfolio_positions(user_id, date DESC)
    WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- =============================================================================
-- INDEX MAINTENANCE AND MONITORING
-- =============================================================================

-- Create function to monitor index usage and performance
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT, 
    indexname TEXT,
    index_scans BIGINT,
    index_size TEXT,
    table_size TEXT,
    usage_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_user_indexes.schemaname,
        pg_stat_user_indexes.relname::TEXT as tablename,
        pg_stat_user_indexes.indexrelname::TEXT as indexname,
        pg_stat_user_indexes.idx_scan as index_scans,
        pg_size_pretty(pg_relation_size(pg_stat_user_indexes.indexrelid)) as index_size,
        pg_size_pretty(pg_relation_size(pg_stat_user_indexes.relid)) as table_size,
        CASE 
            WHEN pg_stat_user_tables.seq_scan + pg_stat_user_indexes.idx_scan = 0 THEN 0
            ELSE ROUND(
                (pg_stat_user_indexes.idx_scan::NUMERIC / 
                 (pg_stat_user_tables.seq_scan + pg_stat_user_indexes.idx_scan)::NUMERIC) * 100, 2
            )
        END as usage_ratio
    FROM pg_stat_user_indexes
    JOIN pg_stat_user_tables ON pg_stat_user_indexes.relid = pg_stat_user_tables.relid
    WHERE pg_stat_user_indexes.schemaname NOT IN ('information_schema', 'pg_catalog')
    ORDER BY pg_stat_user_indexes.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to identify slow queries that might benefit from new indexes
CREATE OR REPLACE FUNCTION get_slow_queries_analysis()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time_ms NUMERIC,
    avg_time_ms NUMERIC,
    rows_examined BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_statements.query::TEXT as query_text,
        pg_stat_statements.calls,
        ROUND(pg_stat_statements.total_exec_time::NUMERIC, 2) as total_time_ms,
        ROUND(pg_stat_statements.mean_exec_time::NUMERIC, 2) as avg_time_ms,
        pg_stat_statements.rows as rows_examined
    FROM pg_stat_statements
    WHERE pg_stat_statements.mean_exec_time > 100 -- queries slower than 100ms
        AND pg_stat_statements.calls > 10 -- called more than 10 times
    ORDER BY pg_stat_statements.mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DEPLOYMENT VERIFICATION QUERIES
-- =============================================================================

-- Verify all indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
    AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Check index sizes and estimate impact
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
    AND schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- Performance validation queries (run before and after index creation)
-- Query 1: Strategy data performance test
EXPLAIN (ANALYZE, BUFFERS) 
SELECT symbol, timestamp, strategy_value 
FROM strategy_data 
WHERE symbol = 'AAPL' AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC 
LIMIT 100;

-- Query 2: Portfolio positions performance test  
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, asset_symbol, market_value, unrealized_pnl
FROM portfolio_positions
WHERE user_id = 'user123' AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Query 3: Market data performance test
EXPLAIN (ANALYZE, BUFFERS)
SELECT symbol, date, close_price, volume
FROM market_data  
WHERE symbol IN ('AAPL', 'GOOGL', 'MSFT') AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY symbol, date DESC;

-- =============================================================================
-- ROLLBACK PROCEDURES (if needed)
-- =============================================================================

-- Generate rollback script for all performance indexes
-- Run this query to get DROP statements if rollback is needed:
/*
SELECT 'DROP INDEX CONCURRENTLY IF EXISTS ' || indexname || ';' as rollback_statement
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
    AND schemaname = 'public'
ORDER BY indexname;
*/

-- Monitor long-running index creation
-- Use this query during index creation to monitor progress:
/*
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE query LIKE '%CREATE INDEX%'
    AND state = 'active'
ORDER BY duration DESC;
*/

-- =============================================================================
-- MAINTENANCE SCHEDULE
-- =============================================================================

-- Recommended maintenance tasks:
-- 1. Weekly: Run get_index_usage_stats() to monitor index effectiveness
-- 2. Monthly: Run get_slow_queries_analysis() to identify new optimization opportunities  
-- 3. Quarterly: Review and update partial index date ranges
-- 4. As needed: REINDEX indexes that show fragmentation or performance degradation

-- Example maintenance query to check for unused indexes:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan < 100  -- Indexes used less than 100 times
    AND pg_relation_size(indexrelid) > 1048576  -- Larger than 1MB
ORDER BY pg_relation_size(indexrelid) DESC;
*/