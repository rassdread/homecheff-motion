-- SP.2B — HomeCheff central identity link on Studio User
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN "centralUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "centralLinkedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_centralUserId_key" ON "User"("centralUserId");
