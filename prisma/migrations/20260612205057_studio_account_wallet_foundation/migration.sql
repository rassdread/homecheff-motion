-- CreateTable
CREATE TABLE "StudioAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'free',
    "studioPlan" TEXT NOT NULL DEFAULT 'free',
    "planVersion" TEXT NOT NULL DEFAULT 'v1',
    "creditPolicyVersion" TEXT NOT NULL DEFAULT 'v1',
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "billingStatus" TEXT NOT NULL DEFAULT 'none',
    "activatedAt" TIMESTAMP(3),
    "autoChargeSmallActions" BOOLEAN NOT NULL DEFAULT true,
    "confirmAboveCredits" INTEGER NOT NULL DEFAULT 100,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "reservedBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePurchased" INTEGER NOT NULL DEFAULT 0,
    "lifetimeGranted" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRefunded" INTEGER NOT NULL DEFAULT 0,
    "lastTransactionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "service" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "creditsDelta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "provider" TEXT,
    "providerCostUsd" DOUBLE PRECISION,
    "reservedCostUsd" DOUBLE PRECISION,
    "marginEstimate" DOUBLE PRECISION,
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioAccount_userId_key" ON "StudioAccount"("userId");

-- CreateIndex
CREATE INDEX "StudioAccount_accountType_idx" ON "StudioAccount"("accountType");

-- CreateIndex
CREATE INDEX "StudioAccount_billingStatus_idx" ON "StudioAccount"("billingStatus");

-- CreateIndex
CREATE INDEX "StudioAccount_stripeCustomerId_idx" ON "StudioAccount"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioWallet_userId_key" ON "StudioWallet"("userId");

-- CreateIndex
CREATE INDEX "StudioLedgerEntry_userId_createdAt_idx" ON "StudioLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StudioLedgerEntry_userId_projectId_idx" ON "StudioLedgerEntry"("userId", "projectId");

-- CreateIndex
CREATE INDEX "StudioLedgerEntry_actionType_idx" ON "StudioLedgerEntry"("actionType");

-- CreateIndex
CREATE INDEX "StudioLedgerEntry_service_idx" ON "StudioLedgerEntry"("service");

-- AddForeignKey
ALTER TABLE "StudioAccount" ADD CONSTRAINT "StudioAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioWallet" ADD CONSTRAINT "StudioWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioLedgerEntry" ADD CONSTRAINT "StudioLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
