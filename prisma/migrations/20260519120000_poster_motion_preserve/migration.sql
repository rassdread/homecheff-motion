-- DeeVid-style poster motion preserve architecture
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "instantPosterMotionSettings" JSONB;
ALTER TABLE "AnimationImage" ADD COLUMN IF NOT EXISTS "posterMotionLayersJson" JSONB;
ALTER TABLE "AnimationProject" ALTER COLUMN "instantTextRenderMode" SET DEFAULT 'poster_motion_preserve';
