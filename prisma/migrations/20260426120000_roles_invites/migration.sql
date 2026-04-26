-- AlterTable User: roles, active flag, inviter
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "invitedById" TEXT;

-- CreateTable AnimationInvite
CREATE TABLE "AnimationInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AnimationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnimationInvite_tokenHash_key" ON "AnimationInvite"("tokenHash");
CREATE INDEX "AnimationInvite_createdByUserId_idx" ON "AnimationInvite"("createdByUserId");
CREATE INDEX "AnimationInvite_email_idx" ON "AnimationInvite"("email");

ALTER TABLE "User"
ADD CONSTRAINT "User_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnimationInvite"
ADD CONSTRAINT "AnimationInvite_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnimationInvite"
ADD CONSTRAINT "AnimationInvite_usedByUserId_fkey"
FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
