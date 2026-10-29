# Production backup plan

This plan was not executed. No Neon branch was created. No restore was run. No production credential was used for a write.

## Before any production migration

1. Confirm the target is still `ep-wild-morning-alynrf2i`, database `neondb`. Re-read it. Do not trust this document if the endpoint changed.
2. Record the current time and create a Neon branch from that moment, or record the platform point-in-time restore timestamp. Creating that branch is a production write and needs its own approval.
3. Verify the branch by reading `_prisma_migrations` and a few row counts (`User`, `StudioWallet`, `StudioCreativeProject`, `AnimationProject`). Do not print connection strings.
4. Only then run `prisma migrate deploy` for `20261020120000_studio_timeline` against production.
5. Read back the three new tables and confirm pre-existing row counts did not change.

The Neon recovery window was not queried, so an exact restore duration and retention period are UNVERIFIED. The branch created in step 2 is the known recovery point this plan relies on.

## Recovery

Application rollback redeploys the previous Vercel deployment. It does not reverse schema changes.

Preferred database rollback for this additive migration: leave `StudioTimeline`, `StudioTimelineTrack`, and `StudioTimelineClip` in place. The live commit `afbbd4cc` does not query them.

A full database restore from the pre-migration branch is a separate destructive operation. It requires approval, replaces `neondb` with the branch state, and discards writes made after the branch. Do not do that to undo three empty tables.

## Verification after restore

Compare `_prisma_migrations` and the row counts taken in step 3. Confirm the application deployment id matches the intended rollback deployment.
