-- Story Mode / Transition Mode fields for instant_premium projects
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "instantMode" TEXT NOT NULL DEFAULT 'transition';
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "instantTransitionSeconds" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "instantSceneTexts" JSONB;
