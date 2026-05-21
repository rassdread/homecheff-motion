-- Canonical language-export text layers (survives final assembly / rebuild).
ALTER TABLE "AnimationProject" ADD COLUMN "languageTextLayersJson" JSONB;
