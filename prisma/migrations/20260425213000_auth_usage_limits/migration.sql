-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "AnimationUsageLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "presetId" TEXT NOT NULL,
  "estimatedCredits" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnimationUsageLedger_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AnimationProject"
ADD COLUMN "ownerId" TEXT;

-- Backfill existing projects to a stable placeholder user
INSERT INTO "User" ("id", "email", "passwordHash", "createdAt", "updatedAt")
VALUES ('legacy-owner', 'legacy-owner@homecheff.local', 'legacy-no-login', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;

UPDATE "AnimationProject"
SET "ownerId" = 'legacy-owner'
WHERE "ownerId" IS NULL;

ALTER TABLE "AnimationProject"
ALTER COLUMN "ownerId" SET NOT NULL;

-- Indexes
CREATE UNIQUE INDEX "AnimationUsageLedger_projectId_key" ON "AnimationUsageLedger"("projectId");
CREATE INDEX "AnimationProject_ownerId_createdAt_idx" ON "AnimationProject"("ownerId", "createdAt");
CREATE INDEX "AnimationUsageLedger_userId_createdAt_idx" ON "AnimationUsageLedger"("userId", "createdAt");
CREATE INDEX "AnimationUsageLedger_userId_presetId_createdAt_idx" ON "AnimationUsageLedger"("userId", "presetId", "createdAt");

-- Foreign keys
ALTER TABLE "AnimationProject"
ADD CONSTRAINT "AnimationProject_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnimationUsageLedger"
ADD CONSTRAINT "AnimationUsageLedger_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnimationUsageLedger"
ADD CONSTRAINT "AnimationUsageLedger_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
