-- Studio V14: improvement scores + auto-select preference

ALTER TABLE "StudioStoryboard" ADD COLUMN "autoSelectImprovedImage" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "StudioSceneImage" ADD COLUMN "previousVisionScore" INTEGER;
ALTER TABLE "StudioSceneImage" ADD COLUMN "visionImprovementScore" INTEGER;
ALTER TABLE "StudioSceneImage" ADD COLUMN "overallImprovementScore" INTEGER;
