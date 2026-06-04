-- Studio V33 — persistent character voice profiles

ALTER TABLE "StudioCharacter" ADD COLUMN "voiceEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceProvider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceProfile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceLanguage" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceGender" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceDescription" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceLock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioCharacter" ADD COLUMN "voiceProfilesJson" JSONB;

CREATE TABLE "StudioCharacterVoiceHistory" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioCharacterVoiceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioCharacterVoiceHistory_characterId_createdAt_idx" ON "StudioCharacterVoiceHistory"("characterId", "createdAt");

ALTER TABLE "StudioCharacterVoiceHistory" ADD CONSTRAINT "StudioCharacterVoiceHistory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "StudioCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
