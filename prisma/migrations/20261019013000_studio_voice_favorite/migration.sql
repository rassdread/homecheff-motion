-- Additive account-level voice favorites. Does not change catalog rows or character voices.

CREATE TABLE "StudioVoiceFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "providerVoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioVoiceFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioVoiceFavorite_userId_provider_providerVoiceId_key" ON "StudioVoiceFavorite"("userId", "provider", "providerVoiceId");

CREATE INDEX "StudioVoiceFavorite_userId_createdAt_idx" ON "StudioVoiceFavorite"("userId", "createdAt");

ALTER TABLE "StudioVoiceFavorite" ADD CONSTRAINT "StudioVoiceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
