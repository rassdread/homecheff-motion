-- AlterTable
ALTER TABLE "AnimationProject"
  ADD COLUMN "presetId" TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN "viduModel" TEXT,
  ADD COLUMN "viduResolution" TEXT,
  ADD COLUMN "viduDurationSeconds" INTEGER,
  ADD COLUMN "estimatedCredits" INTEGER;
