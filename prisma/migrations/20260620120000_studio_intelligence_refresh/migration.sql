-- Studio V20: refresh / re-sync Studio intelligence on Motion projects
ALTER TABLE "AnimationProject" ADD COLUMN "studioRefreshedAt" TIMESTAMP(3);
ALTER TABLE "AnimationProject" ADD COLUMN "studioRefreshAuditJson" JSONB;
ALTER TABLE "AnimationProject" ADD COLUMN "studioLastStaleReason" TEXT;
