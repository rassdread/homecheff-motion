-- AlterTable
ALTER TABLE "StudioStoryboard" ADD COLUMN "aiDirectorPrompt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "aiDirectorStyleStrength" TEXT NOT NULL DEFAULT 'balanced';
