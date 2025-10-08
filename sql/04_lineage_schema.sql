-- ================================================================================================
-- Módulo H — Data Provenance & Lineage Schema
-- ================================================================================================
-- Complete end-to-end traceability from ingest → transform → aggregate → export
-- For signals, metrics, and reports with SHA256 integrity and audit trail
-- ================================================================================================

-- =============================================================================
-- Lineage Events Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS lineage_events (
    id BIGSERIAL PRIMARY KEY,
    
    -- Entity Classification
    entity TEXT NOT NULL CHECK (entity IN ('signal', 'metric', 'report')),
    ref_id TEXT NOT NULL,         -- Logical ID: signalId/metricKey/reportId
    
    -- Processing Stage
    stage TEXT NOT NULL CHECK (stage IN ('ingest', 'transform', 'aggregate', 'export')),
    
    -- Timestamps
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Source & Process Information
    source TEXT NOT NULL,         -- Provider or process: 'defillama', 'worker:rules', 'pdf:generator'
    
    -- Data Payload (sanitized)
    inputs JSONB,                 -- Input data (URLs, headers whitelist, etc.)
    outputs JSONB,                -- Normalized output (canonical schema, values)
    
    -- Integrity & Security
    hash TEXT NOT NULL,           -- SHA256 of logical content after stage
    notes TEXT,                   -- Optional processing notes (max 500 chars)
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT lineage_events_notes_length CHECK (length(notes) <= 500)
);

-- =============================================================================
-- Performance Indexes
-- =============================================================================

-- Primary lookup by entity and reference ID
CREATE INDEX IF NOT EXISTS idx_lineage_events_entity_ref_stage_ts 
    ON lineage_events(entity, ref_id, stage, ts DESC);

-- Timeline queries by reference ID
CREATE INDEX IF NOT EXISTS idx_lineage_events_ref_id_ts 
    ON lineage_events(ref_id, ts);

-- Source and stage analytics
CREATE INDEX IF NOT EXISTS idx_lineage_events_source_stage 
    ON lineage_events(source, stage, ts DESC);

-- Hash-based lookups for integrity verification
CREATE INDEX IF NOT EXISTS idx_lineage_events_hash 
    ON lineage_events(hash);

-- GIN indexes for JSONB path operations (if available)
CREATE INDEX IF NOT EXISTS idx_lineage_events_inputs_gin 
    ON lineage_events USING GIN (inputs jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_lineage_events_outputs_gin 
    ON lineage_events USING GIN (outputs jsonb_path_ops);

-- =============================================================================
-- Materialized View for Performance (Optional)
-- =============================================================================

-- Fast lookups for complete lineage traces
CREATE MATERIALIZED VIEW IF NOT EXISTS lineage_traces AS
SELECT 
    entity,
    ref_id,
    COUNT(*) as event_count,
    MIN(ts) as first_event_at,
    MAX(ts) as last_event_at,
    array_agg(stage ORDER BY ts) as stages_sequence,
    array_agg(source ORDER BY ts) as sources_sequence,
    bool_and(hash IS NOT NULL AND length(hash) = 64) as integrity_valid
FROM lineage_events
GROUP BY entity, ref_id;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_lineage_traces_entity_ref 
    ON lineage_traces(entity, ref_id);

-- =============================================================================
-- Sample Data for Development
-- =============================================================================

-- Signal lineage example
INSERT INTO lineage_events (entity, ref_id, stage, source, inputs, outputs, hash, notes) VALUES
(
    'signal',
    'defi_llama_tvl_ethereum',
    'ingest',
    'defillama',
    '{"url": "https://api.llama.fi/protocol/ethereum", "method": "GET", "headers": {"user-agent": "adaf-ingester"}}',
    '{"type": "tvl", "chain": "ethereum", "value": 45234567890, "timestamp": "2025-09-29T10:00:00Z", "currency": "USD"}',
    'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    'DeFiLlama TVL ingestion for Ethereum mainnet'
),
(
    'signal',
    'defi_llama_tvl_ethereum',
    'transform',
    'ingest.normalizer',
    '{"raw_value": 45234567890, "raw_timestamp": "2025-09-29T10:00:00Z"}',
    '{"normalized_value": 45234567890, "confidence_score": 0.95, "validation_rules": ["positive_value", "recent_timestamp"], "canonical_schema": "tvl_v2"}',
    'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567a',
    'Applied normalization and validation rules'
);

-- Metric aggregation example
INSERT INTO lineage_events (entity, ref_id, stage, source, inputs, outputs, hash, notes) VALUES
(
    'metric',
    'kpis.quarterly.2025q3',
    'aggregate',
    'read-aggregator',
    '{"metric_keys": ["tvl.ethereum", "tvl.bitcoin", "flows.in", "flows.out"], "window": "quarterly", "period": "2025Q3"}',
    '{"irr": 0.145, "tvpi": 1.87, "moic": 1.23, "dpi": 0.45, "rvpi": 1.42, "nav_usd": 125500000, "flows": {"in": 50000000, "out": 15000000}}',
    'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2',
    'Quarterly KPIs aggregated from TVL and cash flow signals'
),
(
    'metric',
    'por.assets.2025q3',
    'aggregate',
    'read-aggregator',
    '{"chains": ["ETH", "BTC", "SOL"], "addresses_count": 147, "validation_window": "72h"}',
    '{"total_assets_usd": 125500000, "chains": [{"chain": "ETH", "assets_usd": 89500000, "addr_count": 89}, {"chain": "BTC", "assets_usd": 31200000, "addr_count": 45}, {"chain": "SOL", "assets_usd": 4800000, "addr_count": 13}]}',
    'd4e5f6789012345678901234567890abcdef1234567890abcdef1234567abc3',
    'Proof of Reserves aggregated across all monitored chains'
);

-- Report export example
INSERT INTO lineage_events (entity, ref_id, stage, source, inputs, outputs, hash, notes) VALUES
(
    'report',
    'onepager_2025q3_demo.pdf',
    'export',
    'pdf:generator',
    '{"kpis_hash": "c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2", "por_hash": "d4e5f6789012345678901234567890abcdef1234567890abcdef1234567abc3", "template": "onepager_v2", "actor": "system@adaf.com"}',
    '{"file": {"path": "/reports/2025-09-29/onepager_2025q3_demo.pdf", "size_bytes": 87543, "pages": 2}, "generation_time_ms": 2156}',
    'e5f6789012345678901234567890abcdef1234567890abcdef1234567abcd4',
    'OnePager PDF generated with Q3 2025 KPIs and PoR data'
),
(
    'report',
    'quarterly_2025q3_full.pdf',
    'export',
    'pdf:generator',
    '{"kpis_hash": "c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567ab2", "por_hash": "d4e5f6789012345678901234567890abcdef1234567890abcdef1234567abc3", "summary_hash": "f67890abcdef1234567890abcdef1234567890abcdef1234567890abcde5", "template": "quarterly_v3", "actor": "admin@adaf.com"}',
    '{"file": {"path": "/reports/2025-09-29/quarterly_2025q3_full.pdf", "size_bytes": 234567, "pages": 8}, "generation_time_ms": 4789}',
    'f6789012345678901234567890abcdef1234567890abcdef1234567abcde5',
    'Quarterly comprehensive report with detailed methodology and compliance disclosures'
);

-- =============================================================================
-- Refresh Materialized View
-- =============================================================================

REFRESH MATERIALIZED VIEW lineage_traces;

-- =============================================================================
-- Comments for Documentation
-- =============================================================================

COMMENT ON TABLE lineage_events IS 'Complete data provenance and lineage tracking for end-to-end traceability';
COMMENT ON COLUMN lineage_events.entity IS 'Type of tracked entity: signal (raw data), metric (aggregated KPIs/PoR), report (PDF exports)';
COMMENT ON COLUMN lineage_events.ref_id IS 'Logical identifier for the entity across its lifecycle';
COMMENT ON COLUMN lineage_events.stage IS 'Processing stage: ingest (raw data), transform (normalization), aggregate (KPIs), export (PDF)';
COMMENT ON COLUMN lineage_events.source IS 'Source system or process: data provider, worker, or generator service';
COMMENT ON COLUMN lineage_events.inputs IS 'Sanitized input data (URLs, parameters) - no sensitive information';
COMMENT ON COLUMN lineage_events.outputs IS 'Processed output in canonical format';
COMMENT ON COLUMN lineage_events.hash IS 'SHA256 hash of outputs + stage + source for integrity verification';
COMMENT ON COLUMN lineage_events.notes IS 'Optional processing notes (max 500 characters)';

-- =============================================================================
-- Security and Privacy Notes
-- =============================================================================

-- IMPORTANT: 
-- 1. Never store secrets, credentials, or sensitive headers in inputs/outputs
-- 2. Sanitize all personal data before storage
-- 3. Limit blob size to 64KB - use hash summaries for larger data
-- 4. Hash calculation: sha256(JSON.stringify(outputs) + '|' + stage + '|' + source)
-- 5. Regular cleanup of old lineage events based on retention policy