-- Additive voice-characteristic index and filter indexes.
-- Does not rewrite catalog descriptions, favorites, or character voices.

CREATE TABLE "StudioVoiceCharacteristic" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "providerVoiceId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioVoiceCharacteristic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioVoiceCharacteristic_voice_concept_match_key" ON "StudioVoiceCharacteristic"("provider", "providerVoiceId", "concept", "matchType");

CREATE INDEX "StudioVoiceCharacteristic_concept_match_idx" ON "StudioVoiceCharacteristic"("concept", "matchType");

CREATE INDEX "StudioVoiceCharacteristic_voice_idx" ON "StudioVoiceCharacteristic"("provider", "providerVoiceId");

CREATE INDEX "StudioVoiceCharacteristic_category_concept_idx" ON "StudioVoiceCharacteristic"("category", "concept");

ALTER TABLE "StudioVoiceCharacteristic" ADD CONSTRAINT "StudioVoiceCharacteristic_catalog_fkey" FOREIGN KEY ("provider", "providerVoiceId") REFERENCES "StudioVoiceCatalogEntry"("provider", "providerVoiceId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "StudioVoiceCatalogEntry_eligibility_useCase_idx" ON "StudioVoiceCatalogEntry"("eligibilityStatus", "useCase");

CREATE INDEX "StudioVoiceCatalogEntry_eligibility_descriptive_idx" ON "StudioVoiceCatalogEntry"("eligibilityStatus", "descriptive");
