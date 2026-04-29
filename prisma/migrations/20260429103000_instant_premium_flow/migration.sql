-- AlterTable
ALTER TABLE "AnimationProject" ADD COLUMN "projectType" TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE "AnimationProject" ADD COLUMN "instantOutputDurationSeconds" INTEGER;
ALTER TABLE "AnimationProject" ADD COLUMN "instantSelectedChips" JSONB;
ALTER TABLE "AnimationProject" ADD COLUMN "instantUserIntent" TEXT;

-- CreateTable
CREATE TABLE "InstantPremiumPendingOrder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstantPremiumPendingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstantPremiumPendingOrder_stripeCheckoutSessionId_key" ON "InstantPremiumPendingOrder"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "InstantPremiumPendingOrder_ownerId_createdAt_idx" ON "InstantPremiumPendingOrder"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "InstantPremiumPendingOrder" ADD CONSTRAINT "InstantPremiumPendingOrder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
