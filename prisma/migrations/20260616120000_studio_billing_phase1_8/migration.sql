-- Studio Billing Phase 1-8: credit origins, policy, promotions, pricing rules

ALTER TABLE "StudioWallet" ADD COLUMN IF NOT EXISTS "purchasedBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudioWallet" ADD COLUMN IF NOT EXISTS "promotionalBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StudioLedgerEntry" ADD COLUMN IF NOT EXISTS "creditOrigin" TEXT;
CREATE INDEX IF NOT EXISTS "StudioLedgerEntry_creditOrigin_idx" ON "StudioLedgerEntry"("creditOrigin");

CREATE TABLE IF NOT EXISTS "StudioBillingPolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "carryMode" TEXT NOT NULL DEFAULT 'UNLIMITED',
    "newUserGrantCredits" INTEGER NOT NULL DEFAULT 0,
    "defaultConfirmAboveCredits" INTEGER NOT NULL DEFAULT 100,
    "plansJson" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioBillingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudioPromotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "creditAmount" INTEGER NOT NULL,
    "maximumUsers" INTEGER NOT NULL,
    "grantType" TEXT NOT NULL DEFAULT 'PROMOTIONAL',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioPromotion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioPromotion_slug_key" ON "StudioPromotion"("slug");
CREATE INDEX IF NOT EXISTS "StudioPromotion_active_startDate_endDate_idx" ON "StudioPromotion"("active", "startDate", "endDate");

CREATE TABLE IF NOT EXISTS "StudioPromotionRedemption" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditsGranted" INTEGER NOT NULL,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudioPromotionRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioPromotionRedemption_promotionId_userId_key" ON "StudioPromotionRedemption"("promotionId", "userId");
CREATE INDEX IF NOT EXISTS "StudioPromotionRedemption_userId_createdAt_idx" ON "StudioPromotionRedemption"("userId", "createdAt");

ALTER TABLE "StudioPromotionRedemption" DROP CONSTRAINT IF EXISTS "StudioPromotionRedemption_promotionId_fkey";
ALTER TABLE "StudioPromotionRedemption" ADD CONSTRAINT "StudioPromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "StudioPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "StudioPricingRule" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "creditCost" INTEGER NOT NULL,
    "providerCostUsd" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioPricingRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioPricingRule_actionType_key" ON "StudioPricingRule"("actionType");
CREATE INDEX IF NOT EXISTS "StudioPricingRule_active_idx" ON "StudioPricingRule"("active");

INSERT INTO "StudioBillingPolicy" ("id", "carryMode", "newUserGrantCredits", "defaultConfirmAboveCredits", "plansJson", "updatedAt")
VALUES ('default', 'UNLIMITED', 0, 100, '{}', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
