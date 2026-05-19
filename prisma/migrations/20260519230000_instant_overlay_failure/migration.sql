-- Overlay failure tracking for Instant Premium (retry without re-running Vidu).
ALTER TABLE "AnimationProject" ADD COLUMN "lastOverlayError" TEXT;
ALTER TABLE "AnimationProject" ADD COLUMN "failureReason" TEXT;
