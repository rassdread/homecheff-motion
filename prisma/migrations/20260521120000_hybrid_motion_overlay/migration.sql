-- Hybrid Motion Overlay System
ALTER TABLE "AnimationProject" ADD COLUMN "instantTextRenderMode" TEXT NOT NULL DEFAULT 'hybrid_overlay';
ALTER TABLE "AnimationProject" ADD COLUMN "instantHybridOverlayStyle" TEXT NOT NULL DEFAULT 'cinematic';
ALTER TABLE "AnimationProject" ADD COLUMN "instantDetectedTextMetadata" JSONB;
