-- AlterTable
ALTER TABLE "AnimationProject" ADD COLUMN "instantFinalRebuildCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AnimationProject" ADD COLUMN "instantFinalRebuiltAt" TIMESTAMP(3);
ALTER TABLE "AnimationProject" ADD COLUMN "instantPreviousFinalVideoUrl" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN "instantFinalRebuildStatus" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN "instantFinalRebuildAuditJson" JSONB;
