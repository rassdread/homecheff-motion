-- Studio V12: Correction Engine on scene images

ALTER TABLE "StudioSceneImage" ADD COLUMN "correctionRecommendations" JSONB;
ALTER TABLE "StudioSceneImage" ADD COLUMN "promptPatches" JSONB;
ALTER TABLE "StudioSceneImage" ADD COLUMN "correctedPrompt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioSceneImage" ADD COLUMN "regeneratedFromImageId" TEXT;
ALTER TABLE "StudioSceneImage" ADD COLUMN "previousConsistencyScore" INTEGER;
ALTER TABLE "StudioSceneImage" ADD COLUMN "improvementScore" INTEGER;

CREATE INDEX "StudioSceneImage_regeneratedFromImageId_idx" ON "StudioSceneImage"("regeneratedFromImageId");

ALTER TABLE "StudioSceneImage" ADD CONSTRAINT "StudioSceneImage_regeneratedFromImageId_fkey" FOREIGN KEY ("regeneratedFromImageId") REFERENCES "StudioSceneImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
