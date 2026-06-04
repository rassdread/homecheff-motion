-- Studio V34: Character Performance Engine profile fields
ALTER TABLE "StudioCharacter" ADD COLUMN "performanceEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioCharacter" ADD COLUMN "defaultSmileStrength" INTEGER NOT NULL DEFAULT 70;
ALTER TABLE "StudioCharacter" ADD COLUMN "defaultBlinkRate" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "StudioCharacter" ADD COLUMN "defaultHeadMovement" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "StudioCharacter" ADD COLUMN "defaultMouthIntensity" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "StudioCharacter" ADD COLUMN "idleAnimationStyle" TEXT NOT NULL DEFAULT 'subtle';
ALTER TABLE "StudioCharacter" ADD COLUMN "performanceNotes" TEXT NOT NULL DEFAULT '';
