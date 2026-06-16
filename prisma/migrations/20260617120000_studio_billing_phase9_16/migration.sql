-- Studio Billing Phases 9-16: subscription plans, credit packs, promotion v2, promo codes, campaigns

CREATE TABLE "StudioSubscriptionPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "monthlyPriceEur" DOUBLE PRECISION,
    "yearlyPriceEur" DOUBLE PRECISION,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "storageLimitGb" INTEGER,
    "featureFlags" JSONB NOT NULL DEFAULT '[]',
    "autoTopUpAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdYearly" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioSubscriptionPlan_slug_key" ON "StudioSubscriptionPlan"("slug");
CREATE INDEX "StudioSubscriptionPlan_isActive_isVisible_displayOrder_idx" ON "StudioSubscriptionPlan"("isActive", "isVisible", "displayOrder");

CREATE TABLE "StudioCreditPack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceEur" DOUBLE PRECISION NOT NULL,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCreditPack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioCreditPack_slug_key" ON "StudioCreditPack"("slug");
CREATE INDEX "StudioCreditPack_active_displayOrder_idx" ON "StudioCreditPack"("active", "displayOrder");

ALTER TABLE "StudioBillingPolicy" ADD COLUMN IF NOT EXISTS "newUserPromotionCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudioBillingPolicy" ADD COLUMN IF NOT EXISTS "betaLaunchCredits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudioBillingPolicy" ADD COLUMN IF NOT EXISTS "newUserCampaignMaxUsers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudioBillingPolicy" ADD COLUMN IF NOT EXISTS "newUserCampaignRedeemed" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "benefitType" TEXT NOT NULL DEFAULT 'bonus_credits';
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "percentageDiscount" DOUBLE PRECISION;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "fixedDiscountEur" DOUBLE PRECISION;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "subscriptionDiscountPercent" DOUBLE PRECISION;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "creditPackBonusPercent" DOUBLE PRECISION;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "freeTrialCredits" INTEGER;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "newUserOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "specificPlanSlug" TEXT;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "maxRedemptions" INTEGER;
ALTER TABLE "StudioPromotion" ADD COLUMN IF NOT EXISTS "maxRedemptionsPerUser" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "StudioPromotion" ALTER COLUMN "creditAmount" SET DEFAULT 0;
ALTER TABLE "StudioPromotion" ALTER COLUMN "maximumUsers" SET DEFAULT 0;

ALTER TABLE "StudioPromotionRedemption" ADD COLUMN IF NOT EXISTS "promoCodeId" TEXT;

CREATE TABLE "StudioPromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioPromoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioPromoCode_code_key" ON "StudioPromoCode"("code");
CREATE INDEX "StudioPromoCode_promotionId_active_idx" ON "StudioPromoCode"("promotionId", "active");

CREATE TABLE "StudioPromoCodeRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "StudioPromoCodeRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioPromoCodeRedemption_promoCodeId_userId_key" ON "StudioPromoCodeRedemption"("promoCodeId", "userId");
CREATE INDEX "StudioPromoCodeRedemption_userId_appliedAt_idx" ON "StudioPromoCodeRedemption"("userId", "appliedAt");

ALTER TABLE "StudioPromoCode" ADD CONSTRAINT "StudioPromoCode_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "StudioPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioPromoCodeRedemption" ADD CONSTRAINT "StudioPromoCodeRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "StudioPromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
