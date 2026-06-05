-- Studio V37: Audio Production Director planning fields
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioProductionEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioStyle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioPriorityStrategy" TEXT NOT NULL DEFAULT 'balanced';
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioMetadataJson" JSONB;

ALTER TABLE "StudioScene" ADD COLUMN "voicePriority" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "musicPriority" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "soundPriority" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "audioFocus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "duckingMode" TEXT NOT NULL DEFAULT '';
