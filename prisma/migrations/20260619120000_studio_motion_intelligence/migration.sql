-- Studio V19: persist Motion intelligence on AnimationProject
ALTER TABLE "AnimationProject" ADD COLUMN "studioHandoffJson" JSONB;
ALTER TABLE "AnimationProject" ADD COLUMN "studioIntelligenceJson" JSONB;
ALTER TABLE "AnimationProject" ADD COLUMN "studioSourceStoryboardId" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN "studioSourceStoryboardTitle" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN "studioHandoffVersion" INTEGER;
ALTER TABLE "AnimationProject" ADD COLUMN "studioImportedAt" TIMESTAMP(3);
ALTER TABLE "AnimationProject" ADD COLUMN "studioIntelligenceStatus" TEXT;
