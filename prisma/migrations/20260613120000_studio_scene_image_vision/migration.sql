-- Studio V13: Vision Consistency Engine on scene images

ALTER TABLE "StudioSceneImage" ADD COLUMN "visionScore" INTEGER;
ALTER TABLE "StudioSceneImage" ADD COLUMN "visionStatus" TEXT;
ALTER TABLE "StudioSceneImage" ADD COLUMN "visionReport" JSONB;
ALTER TABLE "StudioSceneImage" ADD COLUMN "visionAnalyzedAt" TIMESTAMP(3);
