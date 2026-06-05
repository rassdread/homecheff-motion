-- Studio V38: Audio Asset Director planning fields
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioAssetsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioAssetNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioStoryboard" ADD COLUMN "audioAssetMetadataJson" JSONB;

ALTER TABLE "StudioScene" ADD COLUMN "voiceAssetOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "musicAssetOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "ambienceAssetOverride" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioScene" ADD COLUMN "sfxAssetOverride" TEXT NOT NULL DEFAULT '';
