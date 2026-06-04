-- Studio V21: track Studio scene/image linkage on Motion images
ALTER TABLE "AnimationImage" ADD COLUMN "studioSceneId" TEXT;
ALTER TABLE "AnimationImage" ADD COLUMN "studioSceneImageId" TEXT;
