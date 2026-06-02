-- AlterTable
ALTER TABLE "VideoLanguageExport" ADD COLUMN "versionNote" TEXT;

-- AlterTable
ALTER TABLE "AnimationProject" ADD COLUMN "instantTextVersionNotesJson" JSONB;
