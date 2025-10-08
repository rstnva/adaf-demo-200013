-- OP-X Seeds: Opportunities and Signals for triage testing
-- Run this to populate test data for OP-X triage functionality

-- Clean existing test data
DELETE FROM opportunities WHERE id LIKE 'test-opx-%';
DELETE FROM signals WHERE id LIKE 'sig-opx-%';

-- Insert opportunities with varied characteristics
INSERT INTO opportunities (id, "signalId", type, title, description, metadata, status, confidence, "createdAt", "updatedAt") VALUES

-- Beta opportunities (2)
('test-opx-001', 'sig-opx-001', 'beta', 
 'ETH Basis Trade Setup', 
 'Strong ETH basis divergence indicates profitable carry trade opportunity with 12% annualized yield',
 '{"agentCode":"NM","agentBucket":"basis-monitor","asset":"ETH","var":150000,"sizing":{"notionalPctNAV":0.25,"maxDDbps":200},"risks":["funding","liquidation"]}',
 'proposed', 0.82, NOW() - interval '2 hours', NOW() - interval '2 hours'),

('test-opx-002', 'sig-opx-002', 'beta',
 'BTC Momentum Position',
 'Technical breakout above $45k resistance with strong volume confirms bullish momentum',
 '{"agentCode":"OC","agentBucket":"momentum-tracker","asset":"BTC","var":200000,"sizing":{"notionalPctNAV":0.15,"maxDDbps":150},"risks":["volatility","correlation"]}',
 'proposed', 0.75, NOW() - interval '4 hours', NOW() - interval '4 hours'),

-- Basis opportunities (2)  
('test-opx-003', 'sig-opx-003', 'basis',
 'SOL Perpetual Funding Arb',
 'Negative funding rates on SOL perps create risk-free arbitrage opportunity',
 '{"agentCode":"OF","agentBucket":"funding-arb","asset":"SOL","var":75000,"sizing":{"notionalPctNAV":0.08,"maxDDbps":50},"risks":["exchange","execution"]}',
 'proposed', 0.88, NOW() - interval '1 hour', NOW() - interval '1 hour'),

('test-opx-004', 'sig-opx-004', 'basis',
 'AVAX Basis Convergence Play', 
 'Futures premium to spot exceeding 15% likely to converge by expiry',
 '{"agentCode":"DV","agentBucket":"basis-convergence","asset":"AVAX","var":320000,"sizing":{"notionalPctNAV":0.45,"maxDDbps":300},"risks":["timing","liquidity","counterparty"]}',
 'proposed', 0.65, NOW() - interval '6 hours', NOW() - interval '6 hours'),

-- Real yield (1)
('test-opx-005', 'sig-opx-005', 'realYield',
 'USDC Lending Yield Surge',
 'Money market rates spiking to 8%+ creating attractive USDC lending opportunity',
 '{"agentCode":"MX","agentBucket":"yield-farming","asset":"USDC","var":50000,"sizing":{"notionalPctNAV":0.12,"maxDDbps":25},"risks":["protocol","smart-contract"]}',
 'proposed', 0.91, NOW() - interval '3 hours', NOW() - interval '3 hours'),

-- Arbitrage (1)
('test-opx-006', 'sig-opx-006', 'arb',
 'Cross-Chain USDT Premium',
 'USDT trading at 0.3% premium on Polygon vs Ethereum, profitable with bridge costs',
 '{"agentCode":"NM","agentBucket":"cross-chain-arb","asset":"USDT","var":25000,"sizing":{"notionalPctNAV":0.05,"maxDDbps":15},"risks":["bridge","slippage","gas"]}',
 'proposed', 0.79, NOW() - interval '30 minutes', NOW() - interval '30 minutes'),

-- Additional approved/rejected for filter testing
('test-opx-007', 'sig-opx-007', 'beta',
 'Approved BTC Long Position',
 'Successfully executed BTC long based on institutional flow indicators', 
 '{"agentCode":"OC","agentBucket":"institutional-flow","asset":"BTC","var":180000,"sizing":{"notionalPctNAV":0.18,"maxDDbps":120}}',
 'approved', 0.85, NOW() - interval '24 hours', NOW() - interval '2 hours'),

('test-opx-008', 'sig-opx-008', 'basis', 
 'Rejected High Risk Arb',
 'Cross-exchange arbitrage rejected due to counterparty risk concerns',
 '{"agentCode":"DV","agentBucket":"exchange-arb","asset":"ETH","var":400000,"sizing":{"notionalPctNAV":0.55,"maxDDbps":500}}',
 'rejected', 0.45, NOW() - interval '48 hours', NOW() - interval '6 hours');

-- Insert related signals for consensus calculation (last 7 days)
INSERT INTO signals (id, source, severity, title, description, metadata, timestamp, "createdAt", "updatedAt") VALUES

-- ETH basis signals (for test-opx-001) - high consensus
('sig-opx-001', 'binance-data', 'medium', 'ETH Basis Divergence Alert', 'ETH futures premium elevated', '{"asset":"ETH","bucket":"basis-monitor","direction":"pro"}', NOW() - interval '3 hours', NOW() - interval '3 hours', NOW() - interval '3 hours'),
('sig-opx-eth-1', 'coinbase-flow', 'medium', 'ETH Institutional Interest', 'Large ETH basis trades detected', '{"asset":"ETH","bucket":"basis-monitor","direction":"pro"}', NOW() - interval '5 hours', NOW() - interval '5 hours', NOW() - interval '5 hours'),
('sig-opx-eth-2', 'okx-data', 'high', 'ETH Funding Positive', 'ETH perpetual funding turning positive', '{"asset":"ETH","bucket":"basis-monitor","direction":"pro"}', NOW() - interval '2 hours', NOW() - interval '2 hours', NOW() - interval '2 hours'),
('sig-opx-eth-3', 'deribit-vol', 'low', 'ETH IV Declining', 'ETH implied vol decreasing, basis opportunity', '{"asset":"ETH","bucket":"basis-monitor","direction":"pro"}', NOW() - interval '4 hours', NOW() - interval '4 hours', NOW() - interval '4 hours'),

-- BTC momentum signals (for test-opx-002) - mixed consensus
('sig-opx-002', 'technical-analysis', 'high', 'BTC Technical Breakout', 'BTC breaking key resistance levels', '{"asset":"BTC","bucket":"momentum-tracker","direction":"pro"}', NOW() - interval '4 hours', NOW() - interval '4 hours', NOW() - interval '4 hours'),
('sig-opx-btc-1', 'sentiment-tracker', 'medium', 'BTC Fear Greed Neutral', 'BTC sentiment normalizing from oversold', '{"asset":"BTC","bucket":"momentum-tracker","direction":"pro"}', NOW() - interval '6 hours', NOW() - interval '6 hours', NOW() - interval '6 hours'),
('sig-opx-btc-2', 'whale-alerts', 'low', 'BTC Whale Selling', 'Large BTC movements to exchanges detected', '{"asset":"BTC","bucket":"momentum-tracker","direction":"con"}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('sig-opx-btc-3', 'macro-news', 'medium', 'BTC Macro Headwinds', 'Fed policy concerns affecting BTC outlook', '{"asset":"BTC","bucket":"momentum-tracker","direction":"con"}', NOW() - interval '8 hours', NOW() - interval '8 hours', NOW() - interval '8 hours'),

-- SOL funding arb signals (for test-opx-003) - strong consensus
('sig-opx-003', 'funding-monitor', 'high', 'SOL Funding Negative', 'SOL perpetual funding deeply negative', '{"asset":"SOL","bucket":"funding-arb","direction":"pro"}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('sig-opx-sol-1', 'bybit-data', 'high', 'SOL Perp Premium Negative', 'SOL perp trading below spot consistently', '{"asset":"SOL","bucket":"funding-arb","direction":"pro"}', NOW() - interval '2 hours', NOW() - interval '2 hours', NOW() - interval '2 hours'),
('sig-opx-sol-2', 'ftx-data', 'medium', 'SOL Basis Compressed', 'SOL futures basis compressing vs spot', '{"asset":"SOL","bucket":"funding-arb","direction":"pro"}', NOW() - interval '90 minutes', NOW() - interval '90 minutes', NOW() - interval '90 minutes'),

-- Insert current runtime metrics for scoring calculations
INSERT INTO metrics (key, value, ts) VALUES
('nav.usd', 5000000, NOW()),
('ltv.current', 0.25, NOW()),
('hf.current', 2.1, NOW()),
('slippage.current', 0.35, NOW()), 
('realyield.current', 0.75, NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, ts = EXCLUDED.ts;

-- Verify seed data
SELECT 'Opportunities created:' as result, COUNT(*) as count FROM opportunities WHERE id LIKE 'test-opx-%'
UNION ALL
SELECT 'Signals created:', COUNT(*) FROM signals WHERE id LIKE 'sig-opx-%'
UNION ALL  
SELECT 'Proposed status:', COUNT(*) FROM opportunities WHERE id LIKE 'test-opx-%' AND status = 'proposed'
UNION ALL
SELECT 'High risk (LTV>35%):', COUNT(*) FROM opportunities WHERE id LIKE 'test-opx-%' AND (metadata->>'sizing')::jsonb->>'notionalPctNAV' > '0.35';