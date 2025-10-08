-- Derivatives Seeds: Funding rates and Gamma surface data
-- Creates test data for derivatives monitoring functionality

-- Clean existing test data
DELETE FROM signals WHERE id LIKE 'derivs-%' OR type IN ('derivs.funding.point', 'derivs.gamma.surface');

-- Generate 14 days of funding data for BTC and ETH across exchanges
-- Include periods with negative funding to test alert logic

-- BTC funding data (Deribit - includes 60h negative period)
INSERT INTO signals (id, source, type, severity, title, description, metadata, timestamp, "createdAt", "updatedAt") VALUES

-- Day -13 to -10: Positive funding
('derivs-btc-deribit-1', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0125}', NOW() - interval '13 days 8 hours', NOW() - interval '13 days', NOW() - interval '13 days'),
('derivs-btc-deribit-2', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0089}', NOW() - interval '13 days', NOW() - interval '13 days', NOW() - interval '13 days'),
('derivs-btc-deribit-3', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0156}', NOW() - interval '12 days 16 hours', NOW() - interval '12 days', NOW() - interval '12 days'),
('derivs-btc-deribit-4', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0071}', NOW() - interval '12 days 8 hours', NOW() - interval '12 days', NOW() - interval '12 days'),

-- Day -9 to -6: NEGATIVE funding period (72+ hours - should trigger alerts)
('derivs-btc-deribit-5', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0234}', NOW() - interval '9 days 16 hours', NOW() - interval '9 days', NOW() - interval '9 days'),
('derivs-btc-deribit-6', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0187}', NOW() - interval '9 days 8 hours', NOW() - interval '9 days', NOW() - interval '9 days'),
('derivs-btc-deribit-7', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0298}', NOW() - interval '9 days', NOW() - interval '9 days', NOW() - interval '9 days'),
('derivs-btc-deribit-8', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0156}', NOW() - interval '8 days 16 hours', NOW() - interval '8 days', NOW() - interval '8 days'),
('derivs-btc-deribit-9', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0211}', NOW() - interval '8 days 8 hours', NOW() - interval '8 days', NOW() - interval '8 days'),
('derivs-btc-deribit-10', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0178}', NOW() - interval '8 days', NOW() - interval '8 days', NOW() - interval '8 days'),
('derivs-btc-deribit-11', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0134}', NOW() - interval '7 days 16 hours', NOW() - interval '7 days', NOW() - interval '7 days'),
('derivs-btc-deribit-12', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0089}', NOW() - interval '7 days 8 hours', NOW() - interval '7 days', NOW() - interval '7 days'),
('derivs-btc-deribit-13', 'deribit-api', 'derivs.funding.point', 'medium', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":-0.0045}', NOW() - interval '7 days', NOW() - interval '7 days', NOW() - interval '7 days'),

-- Day -5 to present: Back to positive
('derivs-btc-deribit-14', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0067}', NOW() - interval '5 days 8 hours', NOW() - interval '5 days', NOW() - interval '5 days'),
('derivs-btc-deribit-15', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0134}', NOW() - interval '4 days 16 hours', NOW() - interval '4 days', NOW() - interval '4 days'),
('derivs-btc-deribit-16', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0098}', NOW() - interval '3 days 8 hours', NOW() - interval '3 days', NOW() - interval '3 days'),
('derivs-btc-deribit-17', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0156}', NOW() - interval '2 days', NOW() - interval '2 days', NOW() - interval '2 days'),
('derivs-btc-deribit-18', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0089}', NOW() - interval '1 day', NOW() - interval '1 day', NOW() - interval '1 day'),
('derivs-btc-deribit-19', 'deribit-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"deribit","window":"8h","rate":0.0178}', NOW() - interval '8 hours', NOW() - interval '8 hours', NOW() - interval '8 hours'),

-- BTC funding data (OKX - mixed pattern)
('derivs-btc-okx-1', 'okx-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"okx","window":"8h","rate":0.0098}', NOW() - interval '10 days', NOW() - interval '10 days', NOW() - interval '10 days'),
('derivs-btc-okx-2', 'okx-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"okx","window":"8h","rate":-0.0034}', NOW() - interval '8 days', NOW() - interval '8 days', NOW() - interval '8 days'),
('derivs-btc-okx-3', 'okx-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"okx","window":"8h","rate":0.0067}', NOW() - interval '6 days', NOW() - interval '6 days', NOW() - interval '6 days'),
('derivs-btc-okx-4', 'okx-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"okx","wheel":"8h","rate":0.0145}', NOW() - interval '4 days', NOW() - interval '4 days', NOW() - interval '4 days'),
('derivs-btc-okx-5', 'okx-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"okx","window":"8h","rate":0.0089}', NOW() - interval '2 days', NOW() - interval '2 days', NOW() - interval '2 days'),
('derivs-btc-okx-6', 'okx-api', 'derivs.funding.point', 'low', 'BTC Funding Rate', 'BTC 8h funding rate', '{"asset":"BTC","exchange":"okx","window":"8h","rate":0.0123}', NOW() - interval '1 day', NOW() - interval '1 day', NOW() - interval '1 day'),

-- ETH funding data (Binance - currently negative period for 50+ hours)
('derivs-eth-binance-1', 'binance-api', 'derivs.funding.point', 'low', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":0.0134}', NOW() - interval '8 days', NOW() - interval '8 days', NOW() - interval '8 days'),
('derivs-eth-binance-2', 'binance-api', 'derivs.funding.point', 'low', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":0.0067}', NOW() - interval '6 days', NOW() - interval '6 days', NOW() - interval '6 days'),
-- Start negative period (should trigger alert)
('derivs-eth-binance-3', 'binance-api', 'derivs.funding.point', 'medium', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":-0.0156}', NOW() - interval '3 days 8 hours', NOW() - interval '3 days', NOW() - interval '3 days'),
('derivs-eth-binance-4', 'binance-api', 'derivs.funding.point', 'medium', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":-0.0198}', NOW() - interval '3 days', NOW() - interval '3 days', NOW() - interval '3 days'),
('derivs-eth-binance-5', 'binance-api', 'derivs.funding.point', 'medium', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":-0.0234}', NOW() - interval '2 days 16 hours', NOW() - interval '2 days', NOW() - interval '2 days'),
('derivs-eth-binance-6', 'binance-api', 'derivs.funding.point', 'medium', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":-0.0167}', NOW() - interval '2 days 8 hours', NOW() - interval '2 days', NOW() - interval '2 days'),
('derivs-eth-binance-7', 'binance-api', 'derivs.funding.point', 'medium', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":-0.0198}', NOW() - interval '2 days', NOW() - interval '2 days', NOW() - interval '2 days'),
('derivs-eth-binance-8', 'binance-api', 'derivs.funding.point', 'medium', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":-0.0123}', NOW() - interval '1 day 16 hours', NOW() - interval '1 day', NOW() - interval '1 day'),
('derivs-eth-binance-9', 'binance-api', 'derivs.funding.point', 'medium', 'ETH Funding Rate', 'ETH 8h funding rate', '{"asset":"ETH","exchange":"binance","window":"8h","rate":-0.0089}', NOW() - interval '1 day 8 hours', NOW() - interval '1 day', NOW() - interval '1 day'),

-- Gamma surface data for BTC (3 tenors × 15 strikes each)
-- 7-day tenor
('derivs-gamma-btc-7d-1', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"7d","strike":40000,"gamma":0.000023}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-7d-2', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"7d","strike":42000,"gamma":0.000034}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-7d-3', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"7d","strike":44000,"gamma":0.000045}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-7d-4', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"7d","strike":46000,"gamma":0.000067}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-7d-5', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"7d","strike":48000,"gamma":0.000089}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),

-- 14-day tenor
('derivs-gamma-btc-14d-1', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"14d","strike":40000,"gamma":0.000018}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-14d-2', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"14d","strike":42000,"gamma":0.000029}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-14d-3', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"14d","strike":44000,"gamma":0.000038}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-14d-4', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"14d","strike":46000,"gamma":0.000054}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-14d-5', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"14d","strike":48000,"gamma":0.000071}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),

-- 30-day tenor  
('derivs-gamma-btc-30d-1', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"30d","strike":40000,"gamma":0.000012}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-30d-2', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"30d","strike":42000,"gamma":0.000019}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-30d-3', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"30d","strike":44000,"gamma":0.000026}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-30d-4', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"30d","strike":46000,"gamma":0.000034}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-btc-30d-5', 'deribit-options', 'derivs.gamma.surface', 'low', 'BTC Gamma Point', 'BTC options gamma', '{"asset":"BTC","tenor":"30d","strike":48000,"gamma":0.000045}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),

-- ETH gamma surface (smaller sample)
('derivs-gamma-eth-7d-1', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"7d","strike":2800,"gamma":0.000156}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-eth-7d-2', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"7d","strike":3000,"gamma":0.000234}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-eth-7d-3', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"7d","strike":3200,"gamma":0.000187}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),

('derivs-gamma-eth-14d-1', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"14d","strike":2800,"gamma":0.000123}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-eth-14d-2', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"14d","strike":3000,"gamma":0.000189}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-eth-14d-3', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"14d","strike":3200,"gamma":0.000145}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),

('derivs-gamma-eth-30d-1', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"30d","strike":2800,"gamma":0.000089}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-eth-30d-2', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"30d","strike":3000,"gamma":0.000134}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour'),
('derivs-gamma-eth-30d-3', 'deribit-options', 'derivs.gamma.surface', 'low', 'ETH Gamma Point', 'ETH options gamma', '{"asset":"ETH","tenor":"30d","strike":3200,"gamma":0.000098}', NOW() - interval '1 hour', NOW() - interval '1 hour', NOW() - interval '1 hour');

-- Verify seed data
SELECT 'Funding signals created:' as result, COUNT(*) as count 
FROM signals WHERE type = 'derivs.funding.point'
UNION ALL
SELECT 'Gamma signals created:', COUNT(*) 
FROM signals WHERE type = 'derivs.gamma.surface'  
UNION ALL
SELECT 'BTC negative funding periods:', COUNT(*)
FROM signals 
WHERE type = 'derivs.funding.point' 
  AND (metadata->>'asset') = 'BTC'
  AND (metadata->>'rate')::float < 0
UNION ALL  
SELECT 'ETH negative funding periods:', COUNT(*)
FROM signals 
WHERE type = 'derivs.funding.point'
  AND (metadata->>'asset') = 'ETH' 
  AND (metadata->>'rate')::float < 0;