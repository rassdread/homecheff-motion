-- Stripe-linked promotion fields + discount targeting
ALTER TABLE "StudioPromotion" ADD COLUMN "descriptionInternal" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioPromotion" ADD COLUMN "discountDuration" TEXT NOT NULL DEFAULT 'once';
ALTER TABLE "StudioPromotion" ADD COLUMN "discountDurationMonths" INTEGER;
ALTER TABLE "StudioPromotion" ADD COLUMN "allowedPlanSlugs" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "StudioPromotion" ADD COLUMN "appliesToMonthly" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StudioPromotion" ADD COLUMN "appliesToYearly" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StudioPromotion" ADD COLUMN "bonusCreditsApplyWhen" TEXT NOT NULL DEFAULT 'first_payment';
ALTER TABLE "StudioPromotion" ADD COLUMN "bonusCreditsExpireDays" INTEGER;
ALTER TABLE "StudioPromotion" ADD COLUMN "stripeCouponId" TEXT;

CREATE INDEX "StudioPromotion_stripeCouponId_idx" ON "StudioPromotion"("stripeCouponId");

ALTER TABLE "StudioPromoCode" ADD COLUMN "stripePromotionCodeId" TEXT;

CREATE INDEX "StudioPromoCode_stripePromotionCodeId_idx" ON "StudioPromoCode"("stripePromotionCodeId");
