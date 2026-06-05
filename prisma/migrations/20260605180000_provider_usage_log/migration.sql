-- CreateTable
CREATE TABLE "ProviderUsageLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerJobId" TEXT,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "renderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "durationSeconds" INTEGER,
    "creditsBefore" INTEGER,
    "creditsAfter" INTEGER,
    "creditsUsed" INTEGER,
    "creditUnitCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
    "totalCostUsd" DOUBLE PRECISION,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "estimateReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCreditBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCreditBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderUsageLog_provider_providerJobId_key" ON "ProviderUsageLog"("provider", "providerJobId");

-- CreateIndex
CREATE INDEX "ProviderUsageLog_projectId_createdAt_idx" ON "ProviderUsageLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderUsageLog_userId_createdAt_idx" ON "ProviderUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderUsageLog_provider_createdAt_idx" ON "ProviderUsageLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderUsageLog_status_createdAt_idx" ON "ProviderUsageLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderCreditBalanceSnapshot_provider_capturedAt_idx" ON "ProviderCreditBalanceSnapshot"("provider", "capturedAt");

-- AddForeignKey
ALTER TABLE "ProviderUsageLog" ADD CONSTRAINT "ProviderUsageLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderUsageLog" ADD CONSTRAINT "ProviderUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
