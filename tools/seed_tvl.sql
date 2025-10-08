-- Synthetic TVL points for demo (3 chains x 5 days)
-- Assumes table name "signals" with columns (id, type, source, title, description, severity, metadata, fingerprint, processed, timestamp, createdAt, updatedAt)

WITH base AS (
  SELECT * FROM (
    VALUES
      ('ETH',  1e9),
      ('SOL',  2.5e8),
      ('BASE', 3.8e8)
  ) AS t(chain, basev)
), days AS (
  SELECT generate_series(0,4) AS d
)
INSERT INTO signals (id, type, source, title, description, severity, metadata, fingerprint, processed, "timestamp", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text as id,
  'onchain' as type,
  'OC-1' as source,
  CONCAT('TVL point ', b.chain) as title,
  CONCAT(b.chain, ' tvl.usd=', ROUND(b.basev*(1 + (random()-0.5)*0.1))) as description,
  'low' as severity,
  jsonb_build_object(
    'chain', b.chain,
    'protocol', 'TOTAL',
    'metric', 'tvl.usd',
    'value', ROUND(b.basev*(1 + (random()-0.5)*0.1)),
    'ts', (current_date - d.d)::text
  ) as metadata,
  md5(CONCAT(b.chain,'|TOTAL|tvl.usd|', (current_date - d.d)::text)) as fingerprint,
  false as processed,
  (current_date - d.d)::timestamp as "timestamp",
  now() as "createdAt",
  now() as "updatedAt"
FROM base b CROSS JOIN days d;
