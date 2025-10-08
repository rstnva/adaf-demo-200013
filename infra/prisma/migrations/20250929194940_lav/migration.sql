-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('news', 'onchain', 'offchain', 'derivs', 'metrics');

-- CreateEnum
CREATE TYPE "AgentCategory" AS ENUM ('NM', 'OC', 'OF', 'DV', 'MX', 'OP');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'med', 'high');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('new', 'validated', 'rejected');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('beta', 'basis', 'realYield', 'arb');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('proposed', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AgentCategory" NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "source_id" TEXT,
    "ts" TIMESTAMPTZ(6) NOT NULL,
    "severity" "Severity" NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "status" "SignalStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL,
    "value" DECIMAL(20,8) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "signal_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expr" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(10,6) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_id" TEXT NOT NULL,
    "thesis" TEXT NOT NULL,
    "risks" JSONB NOT NULL,
    "sizing" JSONB NOT NULL,
    "var" DECIMAL(10,6) NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'proposed',

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_code_key" ON "sources"("code");

-- CreateIndex
CREATE UNIQUE INDEX "agents_code_key" ON "agents"("code");

-- CreateIndex
CREATE UNIQUE INDEX "signals_hash_key" ON "signals"("hash");

-- CreateIndex
CREATE INDEX "signals_hash_idx" ON "signals"("hash");

-- CreateIndex
CREATE INDEX "signals_agent_id_ts_idx" ON "signals"("agent_id", "ts" DESC);

-- CreateIndex
CREATE INDEX "signals_status_created_at_idx" ON "signals"("status", "created_at");

-- CreateIndex
CREATE INDEX "metrics_key_ts_idx" ON "metrics"("key", "ts" DESC);

-- CreateIndex
CREATE INDEX "alerts_acknowledged_created_at_idx" ON "alerts"("acknowledged", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "limits_key_key" ON "limits"("key");

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
