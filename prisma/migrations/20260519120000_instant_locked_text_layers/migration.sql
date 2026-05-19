-- AlterTable
ALTER TABLE "AnimationProject" ADD COLUMN "instantLockedTextLayers" JSONB,
ADD COLUMN "instantLockedTextMode" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "AnimationExport" ADD COLUMN "expectedTextLayers" JSONB;
