INSERT INTO metrics(key, ts, value, meta)
VALUES ('nav.usd', now(), 125000000.00, '{"note":"demo"}')
ON CONFLICT DO NOTHING;
