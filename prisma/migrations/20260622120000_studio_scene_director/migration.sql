-- Studio V23: Scene Director & Camera Engine
ALTER TABLE "StudioStoryboard" ADD COLUMN "directorProfile" TEXT NOT NULL DEFAULT 'commercial';

ALTER TABLE "StudioScene" ADD COLUMN "shotType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "cameraMovement" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "sceneEnergy" TEXT NOT NULL DEFAULT 'neutral';
