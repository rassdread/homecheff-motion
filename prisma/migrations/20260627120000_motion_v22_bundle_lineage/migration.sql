-- Motion V22: bundle management, draft lineage, audit
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "bundleName" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "bundleKey" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "sourceLanguage" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "sourceVersion" INTEGER;
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "draftCopiedAt" TIMESTAMP(3);
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "bundleAuditJson" JSONB;

CREATE INDEX IF NOT EXISTS "AnimationProject_ownerId_bundleKey_idx" ON "AnimationProject"("ownerId", "bundleKey");
CREATE INDEX IF NOT EXISTS "AnimationProject_ownerId_bundleName_idx" ON "AnimationProject"("ownerId", "bundleName");
