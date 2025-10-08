-- Guardrails (Limits)
INSERT INTO "limits"("key","value","notes") VALUES
 ('slippage',0.5,'global') ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","notes"=EXCLUDED."notes";
INSERT INTO "limits"("key","value","notes") VALUES
 ('LTV',0.35,'global') ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","notes"=EXCLUDED."notes";
INSERT INTO "limits"("key","value","notes") VALUES
 ('HF',1.6,'global') ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","notes"=EXCLUDED."notes";
INSERT INTO "limits"("key","value","notes") VALUES
 ('RealYield',0.6,'global') ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","notes"=EXCLUDED."notes";

-- Reglas por agenteCode (expr como JSON string)
INSERT INTO "rules"("agentCode","name","expr","enabled","createdAt")
VALUES ('NM-1','Hack/Exploit','{"kind":"keyword","field":"news.title","anyOf":["hack","exploit","breach"],"severity":"high"}',true, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "rules"("agentCode","name","expr","enabled","createdAt")
VALUES ('NM-1','Reg Impact','{"kind":"keyword","field":"news.title","anyOf":["sec","banxico","cnbv","etf","fomc"]}',true, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO "rules"("agentCode","name","expr","enabled","createdAt")
VALUES ('OC-1','TVL Drop 12%','{"kind":"tvl.drop","minDropPct":0.12,"windowH":24}',true, NOW())
ON CONFLICT DO NOTHING;

-- Optional: ETF flows seed (BTC, last 5 days)
DO $$
DECLARE d date := current_date - 4;
BEGIN
	WHILE d <= current_date LOOP
		INSERT INTO signals("type","source","title","description","metadata","fingerprint","timestamp","processed")
		VALUES('offchain','farside','ETF BTC net flow', d::text,
					 jsonb_build_object('asset','BTC','netInUsd', (random()*600000000 - 150000000)::int),
					 md5('seed:etf:'||d::text||random()::text), d::timestamptz, false)
		ON CONFLICT DO NOTHING;
		d := d + 1;
	END LOOP;
END $$;
