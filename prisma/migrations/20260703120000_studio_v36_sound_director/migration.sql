-- Studio V36: Sound Effects Director planning fields

ALTER TABLE "StudioStoryboard" ADD COLUMN "soundEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioStoryboard" ADD COLUMN "soundStyle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "soundDensity" TEXT NOT NULL DEFAULT 'balanced';
ALTER TABLE "StudioStoryboard" ADD COLUMN "soundNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "soundMetadataJson" JSONB;

ALTER TABLE "StudioScene" ADD COLUMN "soundEnvironmentOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "soundCharacterOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "soundPropOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "soundTransitionOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "soundAmbientOverride" TEXT NOT NULL DEFAULT '';
