-- Seed PnL bucket metrics for the last 14 days
-- Keys: pnl.nm.usd, pnl.oc.usd, pnl.of.usd, pnl.dv.usd, pnl.mx.usd, pnl.op.usd

WITH days AS (
  SELECT generate_series(0,13) AS d
)
INSERT INTO metrics(key, ts, value, meta)
SELECT k.key,
       (current_date - d.d)::timestamp + interval '12 hour' as ts,
       ROUND((random()*2000 - 1000), 2) as value,
       jsonb_build_object('note','seed') as meta
FROM days d
CROSS JOIN (VALUES 
  ('pnl.nm.usd'), ('pnl.oc.usd'), ('pnl.of.usd'), ('pnl.dv.usd'), ('pnl.mx.usd'), ('pnl.op.usd')
) AS k(key);
