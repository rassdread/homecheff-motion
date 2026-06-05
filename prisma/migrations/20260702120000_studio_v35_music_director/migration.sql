-- Studio V35: Music Director planning fields
ALTER TABLE "StudioStoryboard" ADD COLUMN "musicEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioStoryboard" ADD COLUMN "musicStyle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "musicIntensity" TEXT NOT NULL DEFAULT 'balanced';
ALTER TABLE "StudioStoryboard" ADD COLUMN "musicNarrativeRole" TEXT NOT NULL DEFAULT 'support_narrative';
ALTER TABLE "StudioStoryboard" ADD COLUMN "musicNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "musicMetadataJson" JSONB;

ALTER TABLE "StudioScene" ADD COLUMN "musicCueType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "musicEnergyTarget" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "musicTransitionType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "musicStartBehavior" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "musicEndBehavior" TEXT NOT NULL DEFAULT '';
