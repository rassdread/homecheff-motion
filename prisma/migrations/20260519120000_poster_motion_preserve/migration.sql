-- DeeVid-style poster motion preserve architecture
-- Idempotent: safe when replayed before or after hybrid_motion_overlay (adds instantTextRenderMode).
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "instantPosterMotionSettings" JSONB;
ALTER TABLE "AnimationImage" ADD COLUMN IF NOT EXISTS "posterMotionLayersJson" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AnimationProject'
      AND column_name = 'instantTextRenderMode'
  ) THEN
    ALTER TABLE "AnimationProject"
      ADD COLUMN "instantTextRenderMode" TEXT NOT NULL DEFAULT 'poster_motion_preserve';
  ELSE
    ALTER TABLE "AnimationProject"
      ALTER COLUMN "instantTextRenderMode" SET DEFAULT 'poster_motion_preserve';
  END IF;
END $$;
