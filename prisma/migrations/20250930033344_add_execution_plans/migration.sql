-- CreateTable
CREATE TABLE "execution_plans" (
    "id" TEXT NOT NULL,
    "oppId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sizing" JSONB NOT NULL,
    "risk" JSONB NOT NULL,
    "checklist" JSONB NOT NULL,
    "handoffs" JSONB NOT NULL,
    "expiry" TIMESTAMP(3),
    "artifacts" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "execution_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "execution_plans_oppId_key" ON "execution_plans"("oppId");

-- CreateIndex
CREATE INDEX "execution_plans_oppId_idx" ON "execution_plans"("oppId");

-- CreateIndex
CREATE INDEX "execution_plans_status_createdAt_idx" ON "execution_plans"("status", "createdAt");
