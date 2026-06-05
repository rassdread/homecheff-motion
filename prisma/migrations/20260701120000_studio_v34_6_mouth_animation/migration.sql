-- Studio V34.6: speaking mouth cycle asset fields
ALTER TABLE "StudioCharacter" ADD COLUMN "mouthAnimationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioCharacter" ADD COLUMN "mouthClosedAssetUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "mouthSmallAssetUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "mouthMediumAssetUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "mouthWideAssetUrl" TEXT NOT NULL DEFAULT '';
