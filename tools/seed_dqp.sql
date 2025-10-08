-- DQP (Data Quality & Pipeline Health) Seed Data
-- Creates various scenarios for testing: OK sources, WARN sources, FAIL sources, duplicates, schema errors

-- First, set up some DQP configuration limits if they don't exist
INSERT INTO limits (key, value, notes) VALUES 
('dqp.freshness.ok', 15, 'DQP freshness OK threshold in minutes'),
('dqp.freshness.warn', 60, 'DQP freshness WARN threshold in minutes'),
('dqp.freshness.fail', 60, 'DQP freshness FAIL threshold in minutes (>=)'),
('dqp.duplicates.warn', 0, 'DQP duplicates WARN threshold (>)'),
('dqp.duplicates.fail', 10, 'DQP duplicates FAIL threshold (>)'),
('dqp.schema.warn', 0, 'DQP schema errors WARN threshold (>)'),
('dqp.schema.fail', 3, 'DQP schema errors FAIL threshold (>)')
ON CONFLICT (key) DO NOTHING;

-- Create some agent rules for mapping signals to agents
INSERT INTO rules (agent_code, name, expr, enabled) VALUES
('NM-1', 'News Monitor Rule 1', '{"type": "news.headline"}', true),
('OC-1', 'OnChain Monitor Rule 1', '{"type": "onchain.tvl.point"}', true),
('OF-1', 'OffChain Monitor Rule 1', '{"type": "offchain.etf.flow"}', true),
('DV-1', 'Derivatives Monitor Rule 1', '{"type": "derivs.funding.point"}', true),
('MX-1', 'Mixed Monitor Rule 1', '{"source": "defillama"}', true),
('OP-X', 'Operations Rule X', '{"type": "regulatory.alert"}', true)
ON CONFLICT DO NOTHING;

-- Scenario 1: OK Sources (recent data, no duplicates, no schema errors)
-- DeFiLlama TVL data - fresh and clean
INSERT INTO signals (id, type, source, title, description, severity, metadata, fingerprint, processed, timestamp, created_at, updated_at) VALUES
('dqp-ok-1', 'onchain.tvl.point', 'defillama', 'ETH TVL Update', 'TVL data point for Ethereum', 'low', 
 '{"chain": "ethereum", "value": 45600000000, "protocol": "uniswap"}', 'defillama-eth-tvl-' || extract(epoch from now())::text, true,
 now() - interval '5 minutes', now() - interval '10 minutes', now() - interval '5 minutes'),

('dqp-ok-2', 'onchain.tvl.point', 'defillama', 'BTC TVL Update', 'TVL data point for Bitcoin L2s', 'low', 
 '{"chain": "bitcoin", "value": 2100000000, "protocol": "stacks"}', 'defillama-btc-tvl-' || extract(epoch from now())::text, true,
 now() - interval '3 minutes', now() - interval '8 minutes', now() - interval '3 minutes'),

-- Recent news data
('dqp-ok-3', 'news.headline', 'coindesk', 'Market Analysis Update', 'Daily market analysis', 'medium', 
 '{"title": "Bitcoin Reaches New All-Time High", "url": "https://coindesk.com/btc-ath", "sentiment": 0.8}', 'coindesk-news-' || extract(epoch from now())::text, true,
 now() - interval '2 minutes', now() - interval '7 minutes', now() - interval '2 minutes'),

-- Recent derivatives data
('dqp-ok-4', 'derivs.funding.point', 'deribit', 'BTC Funding Rate', 'Bitcoin funding rate update', 'low', 
 '{"asset": "BTC", "exchange": "deribit", "rate": 0.0001, "tenor": "perpetual"}', 'deribit-btc-funding-' || extract(epoch from now())::text, true,
 now() - interval '1 minute', now() - interval '6 minutes', now() - interval '1 minute');

-- Scenario 2: WARN Sources (stale data 20-40 minutes old)
INSERT INTO signals (id, type, source, title, description, severity, metadata, fingerprint, processed, timestamp, created_at, updated_at) VALUES
('dqp-warn-1', 'offchain.etf.flow', 'farside', 'ETF Flow Data', 'Bitcoin ETF inflow data', 'medium', 
 '{"asset": "BTC", "netInUsd": 150000000, "fund": "IBIT", "date": "2024-01-15"}', 'farside-btc-etf-' || extract(epoch from (now() - interval '25 minutes'))::text, true,
 now() - interval '25 minutes', now() - interval '30 minutes', now() - interval '25 minutes'),

('dqp-warn-2', 'onchain.tvl.point', 'sosovalue', 'Solana TVL', 'Solana TVL tracking', 'low', 
 '{"chain": "solana", "value": 8900000000, "protocol": "raydium"}', 'sosovalue-sol-tvl-' || extract(epoch from (now() - interval '35 minutes'))::text, true,
 now() - interval '35 minutes', now() - interval '40 minutes', now() - interval '35 minutes');

-- Scenario 3: FAIL Sources (very stale data 120+ minutes old)
INSERT INTO signals (id, type, source, title, description, severity, metadata, fingerprint, processed, timestamp, created_at, updated_at) VALUES
('dqp-fail-1', 'price.spot', 'coinmarketcap', 'Price Update Failed', 'CMC price feed failure', 'high', 
 '{"symbol": "ETH", "price": 3200, "volume": 1500000000}', 'cmc-eth-price-' || extract(epoch from (now() - interval '125 minutes'))::text, true,
 now() - interval '125 minutes', now() - interval '130 minutes', now() - interval '125 minutes'),

('dqp-fail-2', 'social.sentiment', 'twitter', 'Social Sentiment Stale', 'Twitter sentiment analysis stale', 'medium', 
 '{"platform": "twitter", "sentiment": 0.2, "mentions": 45000, "topic": "defi"}', 'twitter-sentiment-' || extract(epoch from (now() - interval '180 minutes'))::text, true,
 now() - interval '180 minutes', now() - interval '185 minutes', now() - interval '180 minutes');

-- Scenario 4: Sources with Duplicates (same fingerprint multiple times in 24h)
-- Create duplicate signals with same fingerprint
INSERT INTO signals (id, type, source, title, description, severity, metadata, fingerprint, processed, timestamp, created_at, updated_at) VALUES
('dqp-dup-1a', 'news.headline', 'reuters', 'Duplicate News Item', 'Same news posted multiple times', 'low', 
 '{"title": "SEC Approves New Crypto Rule", "url": "https://reuters.com/crypto-rule", "sentiment": 0.5}', 'reuters-crypto-rule-duplicate', true,
 now() - interval '30 minutes', now() - interval '35 minutes', now() - interval '30 minutes'),

('dqp-dup-1b', 'news.headline', 'reuters', 'Duplicate News Item', 'Same news posted multiple times', 'low', 
 '{"title": "SEC Approves New Crypto Rule", "url": "https://reuters.com/crypto-rule", "sentiment": 0.5}', 'reuters-crypto-rule-duplicate', true,
 now() - interval '20 minutes', now() - interval '25 minutes', now() - interval '20 minutes'),

('dqp-dup-1c', 'news.headline', 'reuters', 'Duplicate News Item', 'Same news posted multiple times', 'low', 
 '{"title": "SEC Approves New Crypto Rule", "url": "https://reuters.com/crypto-rule", "sentiment": 0.5}', 'reuters-crypto-rule-duplicate', true,
 now() - interval '10 minutes', now() - interval '15 minutes', now() - interval '10 minutes');

-- More duplicates from another source
INSERT INTO signals (id, type, source, title, description, severity, metadata, fingerprint, processed, timestamp, created_at, updated_at) VALUES
('dqp-dup-2a', 'onchain.tvl.point', 'debank', 'Polygon TVL Duplicate', 'Duplicate TVL reading', 'low', 
 '{"chain": "polygon", "value": 1200000000, "protocol": "quickswap"}', 'debank-polygon-tvl-dup', true,
 now() - interval '2 hours', now() - interval '2 hours 5 minutes', now() - interval '2 hours'),

('dqp-dup-2b', 'onchain.tvl.point', 'debank', 'Polygon TVL Duplicate', 'Duplicate TVL reading', 'low', 
 '{"chain": "polygon", "value": 1200000000, "protocol": "quickswap"}', 'debank-polygon-tvl-dup', true,
 now() - interval '1 hour', now() - interval '1 hour 5 minutes', now() - interval '1 hour');

-- Scenario 5: Schema Errors (use change_logs to simulate schema validation failures)
-- These represent signals that failed schema validation
INSERT INTO change_logs (actor, entity, entity_id, field, old, new, at) VALUES
('SYSTEM', 'DQP', 'coingecko:MX-1:price.spot', 'schema_error', '{}', 
 '{"source": "coingecko", "agentCode": "MX-1", "type": "price.spot", "errors": ["missing required field: symbol"]}',
 now() - interval '45 minutes'),

('SYSTEM', 'DQP', 'chainlink:DV-1:derivs.funding.point', 'schema_error', '{}', 
 '{"source": "chainlink", "agentCode": "DV-1", "type": "derivs.funding.point", "errors": ["metadata.asset must be BTC or ETH"]}',
 now() - interval '1 hour'),

('SYSTEM', 'DQP', 'messari:OC-1:onchain.tvl.point', 'schema_error', '{}', 
 '{"source": "messari", "agentCode": "OC-1", "type": "onchain.tvl.point", "errors": ["metadata.value must be positive number"]}',
 now() - interval '2 hours'),

('SYSTEM', 'DQP', 'bloomberg:NM-1:news.headline', 'schema_error', '{}', 
 '{"source": "bloomberg", "agentCode": "NM-1", "type": "news.headline", "errors": ["metadata.url must be non-empty string"]}',
 now() - interval '3 hours');

-- Scenario 6: DQP Incidents (various kinds)
-- Freshness incidents
INSERT INTO change_logs (actor, entity, entity_id, field, old, new, at) VALUES
('SYSTEM', 'DQP', 'coinmarketcap:MX-1:price.spot', 'freshness', '{}', 
 '{"source": "coinmarketcap", "agentCode": "MX-1", "type": "price.spot", "kind": "freshness", "message": "No data received for 125 minutes", "payload": {"lastSeen": "' || (now() - interval '125 minutes')::text || '"}, "acknowledged": false}',
 now() - interval '5 minutes'),

-- Duplicate incidents  
('SYSTEM', 'DQP', 'reuters:NM-1:news.headline', 'duplicate', '{}',
 '{"source": "reuters", "agentCode": "NM-1", "type": "news.headline", "kind": "duplicate", "message": "3 duplicate signals detected in 24h window", "payload": {"fingerprint": "reuters-crypto-rule-duplicate", "count": 3}, "acknowledged": false}',
 now() - interval '10 minutes'),

-- Schema incidents
('SYSTEM', 'DQP', 'chainlink:DV-1:derivs.funding.point', 'schema', '{}',
 '{"source": "chainlink", "agentCode": "DV-1", "type": "derivs.funding.point", "kind": "schema", "message": "Invalid asset value in metadata", "payload": {"errors": ["metadata.asset must be BTC or ETH"], "received": "DOGE"}, "acknowledged": false}',
 now() - interval '15 minutes'),

-- Rate limit incidents
('SYSTEM', 'DQP', 'twitter:NM-1:social.sentiment', 'rate_limit', '{}',
 '{"source": "twitter", "agentCode": "NM-1", "type": "social.sentiment", "kind": "rate_limit", "message": "API rate limit exceeded", "payload": {"retryAfter": 900, "requestsRemaining": 0}, "acknowledged": false}',
 now() - interval '20 minutes'),

-- Provider down incidents
('SYSTEM', 'DQP', 'defillama:OC-1:onchain.tvl.point', 'provider_down', '{}',
 '{"source": "defillama", "agentCode": "OC-1", "type": "onchain.tvl.point", "kind": "provider_down", "message": "API endpoint returning 503 Service Unavailable", "payload": {"statusCode": 503, "endpoint": "/v2/tvl/ethereum"}, "acknowledged": false}',
 now() - interval '25 minutes'),

-- Backfill incidents
('SYSTEM', 'DQP', 'farside:OF-1:offchain.etf.flow', 'backfill', '{}',
 '{"source": "farside", "agentCode": "OF-1", "type": "offchain.etf.flow", "kind": "backfill", "message": "Data arrived 26 hours late", "payload": {"expectedTime": "' || (now() - interval '26 hours')::text || '", "actualTime": "' || now()::text || '"}, "acknowledged": false}',
 now() - interval '30 minutes');

-- Scenario 7: Some acknowledged incidents (for testing ack functionality)
INSERT INTO change_logs (actor, entity, entity_id, field, old, new, at) VALUES
('SYSTEM', 'DQP', 'coingecko:MX-1:price.spot', 'freshness', '{}',
 '{"source": "coingecko", "agentCode": "MX-1", "type": "price.spot", "kind": "freshness", "message": "Stale data detected", "payload": {"staleness": 85}, "acknowledged": true}',
 now() - interval '1 hour'),

('ui', 'DQP', 'CL' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 10), 'ACK_INCIDENT', 
 '{"acknowledged": false}', 
 '{"acknowledged": true, "ackedBy": "ui", "ackedAt": "' || now()::text || '"}',
 now() - interval '55 minutes');

-- Add some additional signals for more realistic data volume in the last 24h
INSERT INTO signals (id, type, source, title, description, severity, metadata, fingerprint, processed, timestamp, created_at, updated_at) VALUES
-- More DefI TVL data points (for count statistics)
('dqp-vol-1', 'onchain.tvl.point', 'defillama', 'Arbitrum TVL', 'Arbitrum TVL update', 'low', 
 '{"chain": "arbitrum", "value": 2800000000, "protocol": "gmx"}', 'defillama-arb-tvl-' || extract(epoch from (now() - interval '4 hours'))::text, true,
 now() - interval '4 hours', now() - interval '4 hours 5 minutes', now() - interval '4 hours'),

('dqp-vol-2', 'onchain.tvl.point', 'defillama', 'Optimism TVL', 'Optimism TVL update', 'low', 
 '{"chain": "optimism", "value": 1900000000, "protocol": "synthetix"}', 'defillama-opt-tvl-' || extract(epoch from (now() - interval '8 hours'))::text, true,
 now() - interval '8 hours', now() - interval '8 hours 5 minutes', now() - interval '8 hours'),

-- More news data
('dqp-vol-3', 'news.headline', 'coindesk', 'DeFi Protocol Hack', 'Security incident reported', 'high', 
 '{"title": "DeFi Protocol Loses $50M in Flash Loan Attack", "url": "https://coindesk.com/defi-hack", "sentiment": -0.7}', 'coindesk-defi-hack-' || extract(epoch from (now() - interval '6 hours'))::text, true,
 now() - interval '6 hours', now() - interval '6 hours 5 minutes', now() - interval '6 hours'),

-- More derivatives data
('dqp-vol-4', 'derivs.funding.point', 'binance', 'ETH Funding Rate', 'Ethereum funding rate', 'low', 
 '{"asset": "ETH", "exchange": "binance", "rate": -0.0002, "tenor": "perpetual"}', 'binance-eth-funding-' || extract(epoch from (now() - interval '12 hours'))::text, true,
 now() - interval '12 hours', now() - interval '12 hours 5 minutes', now() - interval '12 hours'),

-- ETF flow data
('dqp-vol-5', 'offchain.etf.flow', 'farside', 'ETH ETF Flow', 'Ethereum ETF flow data', 'medium', 
 '{"asset": "ETH", "netInUsd": -25000000, "fund": "ETHE", "date": "2024-01-15"}', 'farside-eth-etf-' || extract(epoch from (now() - interval '16 hours'))::text, true,
 now() - interval '16 hours', now() - interval '16 hours 5 minutes', now() - interval '16 hours');

-- Print summary of what was seeded
SELECT 'DQP Seed Data Summary:' as summary;
SELECT 
  'Signals created:' as metric, 
  count(*) as value 
FROM signals 
WHERE id LIKE 'dqp-%'
UNION ALL
SELECT 
  'Incidents created:' as metric, 
  count(*) as value 
FROM change_logs 
WHERE entity = 'DQP' 
  AND field IN ('freshness', 'duplicate', 'schema', 'rate_limit', 'provider_down', 'backfill')
  AND at > now() - interval '1 hour'
UNION ALL
SELECT 
  'Schema errors created:' as metric, 
  count(*) as value 
FROM change_logs 
WHERE entity = 'DQP' 
  AND field = 'schema_error'
  AND at > now() - interval '4 hours';