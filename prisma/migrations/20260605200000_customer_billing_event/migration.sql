-- AlterTable ProviderCostEvent
ALTER TABLE "ProviderCostEvent" ADD COLUMN "providerJobId" TEXT;
ALTER TABLE "ProviderCostEvent" ADD COLUMN "internalCostUsd" DOUBLE PRECISION;

UPDATE "ProviderCostEvent" SET "internalCostUsd" = "totalCostUsd" WHERE "internalCostUsd" IS NULL AND "totalCostUsd" IS NOT NULL;

CREATE INDEX "ProviderCostEvent_providerJobId_idx" ON "ProviderCostEvent"("providerJobId");

-- AlterTable ProviderCreditBalanceSnapshot
ALTER TABLE "ProviderCreditBalanceSnapshot" ADD COLUMN "unitType" TEXT NOT NULL DEFAULT 'credits';
ALTER TABLE "ProviderCreditBalanceSnapshot" ADD COLUMN "metadataJson" JSONB;

-- CreateTable CustomerBillingEvent
CREATE TABLE "CustomerBillingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "providerCostEventId" TEXT,
    "actionType" TEXT NOT NULL,
    "renderType" TEXT NOT NULL,
    "customerUnits" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitType" TEXT NOT NULL DEFAULT 'action',
    "unitPriceEur" DOUBLE PRECISION NOT NULL,
    "grossPriceEur" DOUBLE PRECISION NOT NULL,
    "discountEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPriceEur" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "pricingPlan" TEXT NOT NULL DEFAULT 'v1',
    "pricingRuleLabel" TEXT,
    "marginMode" TEXT NOT NULL DEFAULT 'tiered',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isTestMode" BOOLEAN NOT NULL DEFAULT false,
    "isAdminFree" BOOLEAN NOT NULL DEFAULT false,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerBillingEvent_userId_createdAt_idx" ON "CustomerBillingEvent"("userId", "createdAt");
CREATE INDEX "CustomerBillingEvent_projectId_createdAt_idx" ON "CustomerBillingEvent"("projectId", "createdAt");
CREATE INDEX "CustomerBillingEvent_providerCostEventId_idx" ON "CustomerBillingEvent"("providerCostEventId");
CREATE INDEX "CustomerBillingEvent_actionType_createdAt_idx" ON "CustomerBillingEvent"("actionType", "createdAt");
CREATE INDEX "CustomerBillingEvent_status_createdAt_idx" ON "CustomerBillingEvent"("status", "createdAt");

ALTER TABLE "CustomerBillingEvent" ADD CONSTRAINT "CustomerBillingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerBillingEvent" ADD CONSTRAINT "CustomerBillingEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerBillingEvent" ADD CONSTRAINT "CustomerBillingEvent_providerCostEventId_fkey" FOREIGN KEY ("providerCostEventId") REFERENCES "ProviderCostEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
