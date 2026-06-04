-- Studio V11: Consistency Engine on scene images

ALTER TABLE "StudioSceneImage" ADD COLUMN "consistencyScore" INTEGER;
ALTER TABLE "StudioSceneImage" ADD COLUMN "consistencyStatus" TEXT;
ALTER TABLE "StudioSceneImage" ADD COLUMN "consistencyReport" JSONB;
ALTER TABLE "StudioSceneImage" ADD COLUMN "consistencyRecommendations" JSONB;
ALTER TABLE "StudioSceneImage" ADD COLUMN "consistencyAnalyzedAt" TIMESTAMP(3);
