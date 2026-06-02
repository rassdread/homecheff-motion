-- AlterTable
ALTER TABLE "AnimationProject" ADD COLUMN "instantCleanFinalVideoUrl" TEXT;

-- AlterTable
ALTER TABLE "VideoLanguageExport" ADD COLUMN "sourceCleanVideoUrl" TEXT;
ALTER TABLE "VideoLanguageExport" ADD COLUMN "overlayRenderMode" TEXT NOT NULL DEFAULT 'typography';
ALTER TABLE "VideoLanguageExport" ADD COLUMN "sceneTextsJson" JSONB;
