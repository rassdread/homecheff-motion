-- AlterTable
ALTER TABLE "AnimationImage" ADD COLUMN     "hasBakedText" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bakedTextProtectionStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "bakedTextExactCopy" TEXT,
ADD COLUMN     "bakedTextMaskRegion" JSONB,
ADD COLUMN     "viduInputUrl" TEXT;
