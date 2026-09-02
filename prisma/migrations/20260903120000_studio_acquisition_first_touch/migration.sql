-- AlterTable
ALTER TABLE "StudioAccount" ADD COLUMN     "acquisitionFirstTouch" JSONB,
ADD COLUMN     "acquisitionActivatedAt" TIMESTAMP(3),
ADD COLUMN     "acquisitionActivationKind" TEXT;
