-- Studio V28: AI Voice Director storyboard settings
ALTER TABLE "StudioStoryboard" ADD COLUMN "voiceEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioStoryboard" ADD COLUMN "voiceLanguage" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "StudioStoryboard" ADD COLUMN "voiceStyle" TEXT NOT NULL DEFAULT 'warm';
ALTER TABLE "StudioStoryboard" ADD COLUMN "voiceProfile" TEXT NOT NULL DEFAULT 'warm_narrator';
ALTER TABLE "StudioStoryboard" ADD COLUMN "narrationMode" TEXT NOT NULL DEFAULT 'narrator';
ALTER TABLE "StudioStoryboard" ADD COLUMN "voiceNarrationScript" TEXT NOT NULL DEFAULT '';
