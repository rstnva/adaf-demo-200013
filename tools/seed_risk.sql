-- Seed 90d NAV series (daily, UTC last sample) and current VaR metrics

WITH days AS (
  SELECT generate_series(0,89) AS d
)
INSERT INTO metrics(key, ts, value, meta)
SELECT 'nav.usd', (current_date - d.d)::timestamp + interval '23 hour',
       ROUND(100_000_000 + (random()-0.5)*5_000_000 + d.d*100_000, 2),
       jsonb_build_object('note','seed')
FROM days d;

-- VaR metrics (latest timestamp)
INSERT INTO metrics(key, ts, value, meta)
VALUES
  ('var.1d.usd', now(), 1_100_000.00, '{"note":"seed"}'),
  ('var.7d.usd', now(), 3_000_000.00, '{"note":"seed"}')
ON CONFLICT DO NOTHING;
