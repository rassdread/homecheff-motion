-- AlterTable
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "displayNameNl" TEXT;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "displayNameEn" TEXT;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "descriptionNl" TEXT;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "visibleInCatalog" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "marginWarningThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "StudioPricingRule" ADD COLUMN IF NOT EXISTS "updatedByUserId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudioPricingRule_category_sortOrder_idx" ON "StudioPricingRule"("category", "sortOrder");
CREATE INDEX IF NOT EXISTS "StudioPricingRule_visibleInCatalog_active_idx" ON "StudioPricingRule"("visibleInCatalog", "active");
