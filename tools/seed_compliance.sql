-- Create table if not exists and seed 6 items
CREATE TABLE IF NOT EXISTS compliance_items (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass','warn','fail')),
  evidence_url TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_by TEXT
);

INSERT INTO compliance_items(key,title,status,evidence_url,updated_at,updated_by) VALUES
 ('kyc.lps','KYC de LPs','pass','https://example.com/kyc-lps', now(), 'seed'),
 ('beneficial.owners','Beneficial Owners','warn',NULL, now(), 'seed'),
 ('ofac.screening','OFAC Screening','pass','https://example.com/ofac', now(), 'seed'),
 ('sar.workflow','SAR Workflow','fail',NULL, now(), 'seed'),
 ('travel.rule','Travel Rule','warn','https://example.com/travel', now(), 'seed'),
 ('por.mensual','Prueba de Reservas mensual','pass','https://example.com/por', now(), 'seed')
ON CONFLICT (key) DO NOTHING;
