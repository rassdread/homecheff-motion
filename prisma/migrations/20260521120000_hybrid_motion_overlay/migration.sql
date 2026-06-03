-- Hybrid Motion Overlay System
-- IF NOT EXISTS: poster_motion_preserve may have created instantTextRenderMode earlier in the chain.
ALTER TABLE "AnimationProject" ADD COLUMN IF NOT EXISTS "instantTextRenderMode" TEXT NOT NULL DEFAULT 'hybrid_overlay';
ALTER TABLE "AnimationProject" ADD COLUMN "instantHybridOverlayStyle" TEXT NOT NULL DEFAULT 'cinematic';
ALTER TABLE "AnimationProject" ADD COLUMN "instantDetectedTextMetadata" JSONB;
