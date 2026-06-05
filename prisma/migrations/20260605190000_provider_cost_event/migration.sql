-- CreateTable
CREATE TABLE "ProviderCostEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT,
    "relatedJobId" TEXT,
    "relatedExportId" TEXT,
    "balanceBefore" DOUBLE PRECISION,
    "balanceAfter" DOUBLE PRECISION,
    "unitsUsed" DOUBLE PRECISION,
    "unitType" TEXT NOT NULL,
    "unitCostUsd" DOUBLE PRECISION NOT NULL,
    "totalCostUsd" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "estimateReason" TEXT,
    "metadataJson" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCostEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderCostEvent_projectId_createdAt_idx" ON "ProviderCostEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderCostEvent_userId_createdAt_idx" ON "ProviderCostEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderCostEvent_provider_actionType_createdAt_idx" ON "ProviderCostEvent"("provider", "actionType", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderCostEvent_relatedJobId_idx" ON "ProviderCostEvent"("relatedJobId");

-- CreateIndex
CREATE INDEX "ProviderCostEvent_relatedExportId_idx" ON "ProviderCostEvent"("relatedExportId");

-- CreateIndex
CREATE INDEX "ProviderCostEvent_status_createdAt_idx" ON "ProviderCostEvent"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderCostEvent" ADD CONSTRAINT "ProviderCostEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCostEvent" ADD CONSTRAINT "ProviderCostEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
