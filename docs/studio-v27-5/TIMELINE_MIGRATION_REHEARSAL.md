# Timeline migration rehearsal

Migration: `prisma/migrations/20261020120000_studio_timeline/migration.sql`

## SQL

Creates `StudioTimeline`, `StudioTimelineTrack`, and `StudioTimelineClip`, plus indexes and foreign keys to `StudioCreativeProject` and between the new tables. The header states no backfill and no media deletion. The file contains no `DROP` and no `ALTER` of an existing column.

Depends on `StudioCreativeProject`, which already exists in the finished production migration history.

## Disposable apply

Database: `homecheff_v275_timeline_rehearsal` on `127.0.0.1:5432`, created for this rehearsal.

`npx prisma migrate deploy` with `DATABASE_URL` pointed only at that database:

1. First run applied through `20261020120000_studio_timeline`. Exit 0.
2. Second run reported no pending migrations. Exit 0.

Tables present: `StudioTimeline`, `StudioTimelineTrack`, `StudioTimelineClip`. Timeline row count 0. `AnimationProject` count 0. `User` count 1, domain `homecheff.local`, inserted by the existing migration `20260425213000_auth_usage_limits`. That is a local schema seed, not a customer row.

The existing test `studio-timeline-migration.db.test.ts` passed on `homecheff_timeline_migrate_cert`.

## Not done

Production endpoint `ep-wild-morning-alynrf2i` was not used. No protected preview database was used. A successful disposable apply does not authorize a production migration.

## Approval boundary

Applying this migration to `neondb` requires a separate explicit approval, a backup taken first, and the production release approval. Application rollback does not remove these tables. Leaving them in place is safe because the current live application does not read them.
