-- Studio V10: Character & World Memory Engine

CREATE TABLE "StudioWorldProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "visualStyle" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '',
    "continuityRules" TEXT NOT NULL DEFAULT '',
    "continuityStrength" TEXT NOT NULL DEFAULT 'strong',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioWorldProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioWorldProfile_ownerId_slug_key" ON "StudioWorldProfile"("ownerId", "slug");
CREATE INDEX "StudioWorldProfile_ownerId_createdAt_idx" ON "StudioWorldProfile"("ownerId", "createdAt");

ALTER TABLE "StudioWorldProfile" ADD CONSTRAINT "StudioWorldProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioCharacter" ADD COLUMN "appearanceMemory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "personalityMemory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "continuityNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "defaultClothing" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "defaultAccessories" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "visualKeywords" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "primaryReferenceImageId" TEXT;
ALTER TABLE "StudioCharacter" ADD COLUMN "referenceNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "identityStrength" TEXT NOT NULL DEFAULT 'strong';
ALTER TABLE "StudioCharacter" ADD COLUMN "continuityStrength" TEXT NOT NULL DEFAULT 'strong';
ALTER TABLE "StudioCharacter" ADD COLUMN "worldProfileId" TEXT;

ALTER TABLE "StudioLocation" ADD COLUMN "worldMemory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioLocation" ADD COLUMN "visualIdentity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioLocation" ADD COLUMN "environmentKeywords" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioLocation" ADD COLUMN "continuityNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioLocation" ADD COLUMN "continuityStrength" TEXT NOT NULL DEFAULT 'strong';
ALTER TABLE "StudioLocation" ADD COLUMN "worldProfileId" TEXT;

ALTER TABLE "StudioProp" ADD COLUMN "appearanceMemory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioProp" ADD COLUMN "brandingRules" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioProp" ADD COLUMN "continuityNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioProp" ADD COLUMN "continuityStrength" TEXT NOT NULL DEFAULT 'strong';
ALTER TABLE "StudioProp" ADD COLUMN "worldProfileId" TEXT;

CREATE INDEX "StudioCharacter_worldProfileId_idx" ON "StudioCharacter"("worldProfileId");
CREATE INDEX "StudioLocation_worldProfileId_idx" ON "StudioLocation"("worldProfileId");
CREATE INDEX "StudioProp_worldProfileId_idx" ON "StudioProp"("worldProfileId");

ALTER TABLE "StudioCharacter" ADD CONSTRAINT "StudioCharacter_worldProfileId_fkey" FOREIGN KEY ("worldProfileId") REFERENCES "StudioWorldProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioLocation" ADD CONSTRAINT "StudioLocation_worldProfileId_fkey" FOREIGN KEY ("worldProfileId") REFERENCES "StudioWorldProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioProp" ADD CONSTRAINT "StudioProp_worldProfileId_fkey" FOREIGN KEY ("worldProfileId") REFERENCES "StudioWorldProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
