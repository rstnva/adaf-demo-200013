-- ================================================================================================
-- Módulo I — Research & Backtesting Schema
-- ================================================================================================
-- Database schema for strategy backtesting, research sandbox, and performance measurement
-- Supports signal-based strategy evaluation with comprehensive KPI tracking
-- ================================================================================================

-- =============================================================================
-- Backtests Table - Main backtest configurations and results
-- =============================================================================

CREATE TABLE backtests (
    id BIGSERIAL PRIMARY KEY,
    
    -- Metadata
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor TEXT NOT NULL CHECK (char_length(actor) > 0),
    
    -- Configuration (JSON)
    config JSONB NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')) DEFAULT 'queued',
    
    -- Results and logs
    results JSONB,
    logs TEXT,
    error_message TEXT,
    
    -- Performance metadata
    duration_ms INTEGER,
    data_points INTEGER,
    coverage_pct NUMERIC(5,2)
);

-- =============================================================================
-- Backtest Runs Table - Execution history and statistics
-- =============================================================================

CREATE TABLE backtest_runs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Foreign key
    backtest_id BIGINT NOT NULL REFERENCES backtests(id) ON DELETE CASCADE,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    
    -- Run-specific statistics
    stats JSONB,
    
    -- Execution metadata
    actor TEXT NOT NULL,
    version TEXT DEFAULT 'v1.0',
    environment TEXT DEFAULT 'production'
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Primary query patterns
CREATE INDEX idx_backtests_created_at ON backtests (created_at DESC);
CREATE INDEX idx_backtests_status ON backtests (status);
CREATE INDEX idx_backtests_actor ON backtests (actor);

-- Backtest runs queries
CREATE INDEX idx_backtest_runs_backtest_id ON backtest_runs (backtest_id, started_at DESC);
CREATE INDEX idx_backtest_runs_started_at ON backtest_runs (started_at DESC);

-- JSON queries on config
CREATE INDEX idx_backtests_config_agents ON backtests USING GIN ((config->'agents'));
CREATE INDEX idx_backtests_config_benchmark ON backtests ((config->>'benchmark'));
CREATE INDEX idx_backtests_config_window ON backtests USING GIN ((config->'window'));

-- JSON queries on results
CREATE INDEX idx_backtests_results_kpis ON backtests USING GIN ((results->'kpis')) WHERE results IS NOT NULL;

-- =============================================================================
-- Materialized View for Dashboard Performance
-- =============================================================================

CREATE MATERIALIZED VIEW backtest_summary AS
SELECT 
    b.id,
    b.name,
    b.status,
    b.created_at,
    b.actor,
    b.config->>'benchmark' as benchmark,
    COALESCE(array_length(ARRAY(SELECT jsonb_array_elements_text(b.config->'agents')), 1), 0) as agent_count,
    b.results->'kpis'->>'pnlPct' as pnl_pct,
    b.results->'kpis'->>'sharpe' as sharpe,
    b.results->'kpis'->>'maxDDPct' as max_dd_pct,
    b.results->'kpis'->>'hitRate' as hit_rate,
    b.coverage_pct,
    b.duration_ms,
    (SELECT COUNT(*) FROM backtest_runs br WHERE br.backtest_id = b.id) as run_count,
    (SELECT MAX(br.started_at) FROM backtest_runs br WHERE br.backtest_id = b.id) as last_run_at
FROM backtests b;

CREATE UNIQUE INDEX idx_backtest_summary_id ON backtest_summary (id);
CREATE INDEX idx_backtest_summary_status ON backtest_summary (status);
CREATE INDEX idx_backtest_summary_created_at ON backtest_summary (created_at DESC);

-- =============================================================================
-- Functions and Triggers
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_backtests_updated_at 
    BEFORE UPDATE ON backtests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_backtest_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY backtest_summary;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Sample Data for Development
-- =============================================================================

-- Sample backtest configuration
INSERT INTO backtests (name, actor, config, status) VALUES 
(
    'ETF Flow + TVL Momentum Strategy',
    'research@adaf.com',
    '{
        "name": "ETF Flow + TVL Momentum Strategy",
        "agents": ["NM-1", "OF-1", "OC-1"],
        "rules": [
            {
                "expr": "etf.flow.usd > 100000000 AND tvl.change7d > 0.05",
                "weight": 0.6
            },
            {
                "expr": "funding.rate < -0.01 OR volatility.rank < 0.3",
                "weight": 0.4
            }
        ],
        "window": {
            "from": "2025-07-01T00:00:00Z",
            "to": "2025-09-01T00:00:00Z"
        },
        "feesBps": 5,
        "slippageBps": 3,
        "sizing": {
            "notionalPctNAV": 0.25
        },
        "benchmark": "BTC",
        "rebalanceDays": 1
    }',
    'queued'
),
(
    'Momentum + Mean Reversion Combo',
    'analyst@adaf.com', 
    '{
        "name": "Momentum + Mean Reversion Combo",
        "agents": ["TM-1", "AR-1"],
        "rules": [
            {
                "expr": "price.momentum14d > 0.1 AND rsi.daily < 70",
                "weight": 0.7
            },
            {
                "expr": "volume.spike > 2.0 AND orderbook.imbalance > 0.6",
                "weight": 0.3
            }
        ],
        "window": {
            "from": "2025-06-01T00:00:00Z", 
            "to": "2025-09-15T00:00:00Z"
        },
        "feesBps": 8,
        "slippageBps": 5,
        "sizing": {
            "notionalPctNAV": 0.15
        },
        "benchmark": "ETH",
        "rebalanceDays": 3
    }',
    'done'
);

-- Sample results for the completed backtest
UPDATE backtests 
SET 
    results = '{
        "kpis": {
            "pnlUsd": 125000.50,
            "pnlPct": 0.1847,
            "maxDDPct": -0.0892,
            "sharpe": 1.23,
            "hitRate": 0.634,
            "trades": 47,
            "volPct": 0.2456,
            "vsBenchmarkPct": 0.0423
        },
        "equity": [
            {"ts": "2025-06-01T00:00:00Z", "nav": 1.0000, "strat": 1.0000, "bench": 1.0000},
            {"ts": "2025-06-02T00:00:00Z", "nav": 1.0000, "strat": 1.0023, "bench": 1.0015},
            {"ts": "2025-06-03T00:00:00Z", "nav": 1.0000, "strat": 1.0089, "bench": 1.0031}
        ],
        "monthlyPnL": [
            {"ym": "2025-06", "pnlPct": 0.0567},
            {"ym": "2025-07", "pnlPct": 0.0823},
            {"ym": "2025-08", "pnlPct": 0.0457}
        ],
        "notes": [
            "Data coverage: 94.2% (missing 4 days due to market holidays)",
            "Strategy performed well during high volatility periods",
            "Outperformed benchmark by 4.23% with lower maximum drawdown"
        ]
    }',
    duration_ms = 2847,
    data_points = 2156,
    coverage_pct = 94.20,
    status = 'done'
WHERE name = 'Momentum + Mean Reversion Combo';

-- Sample backtest runs
INSERT INTO backtest_runs (backtest_id, started_at, finished_at, stats, actor) VALUES
(
    (SELECT id FROM backtests WHERE name = 'Momentum + Mean Reversion Combo'),
    '2025-09-28 14:30:00+00',
    '2025-09-28 14:32:47+00',
    '{
        "signals_processed": 2156,
        "rules_evaluated": 4312,
        "trades_executed": 47,
        "data_quality_score": 0.942,
        "execution_phases": {
            "data_loading": 450,
            "signal_processing": 1823,
            "pnl_calculation": 421,
            "kpi_aggregation": 153
        }
    }',
    'analyst@adaf.com'
);

-- Refresh materialized view
SELECT refresh_backtest_summary();

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Verify schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('backtests', 'backtest_runs')
ORDER BY table_name, ordinal_position;

-- Verify sample data
SELECT 
    id,
    name,
    status,
    actor,
    config->>'benchmark' as benchmark,
    results->'kpis'->>'pnlPct' as pnl_pct,
    created_at
FROM backtests;

-- Verify materialized view
SELECT * FROM backtest_summary ORDER BY created_at DESC;