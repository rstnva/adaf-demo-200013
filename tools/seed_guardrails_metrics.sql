-- Seed runtime guardrail metrics for immediate demo purposes
-- Keys used by /api/read/kpi/limits: ltv.current, hf.current, slippage.current, realyield.current
-- Adjust values to simulate green/warn/red states as desired.

INSERT INTO metrics (key, value, ts)
VALUES
  ('ltv.current',        0.32, now()),     -- LTV 32%
  ('hf.current',         1.75, now()),     -- Health Factor 1.75
  ('slippage.current',   0.42, now()),     -- Slippage 0.42%
  ('realyield.current',  0.58, now())      -- Real Yield 0.58%
ON CONFLICT DO NOTHING;