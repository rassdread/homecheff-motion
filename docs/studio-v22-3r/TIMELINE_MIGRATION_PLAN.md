# Timeline migration plan

Status: prepared and tested on the disposable local database only.

Production and Preview schemas were not changed.

## Change

Additive tables, copied from the existing unapplied timeline migration:

- `StudioTimeline` — one row per `StudioCreativeProject.id`
- `StudioTimelineTrack`
- `StudioTimelineClip`

File: `prisma/migrations/20261020120000_studio_timeline/migration.sql`.

Foreign keys use `ON DELETE CASCADE`. Deleting a timeline clip does not delete the scene, the scene image, or the library file.

There is no backfill and no update of existing rows.

## Pre-migration checks

1. Confirm the target is the intended database. Refuse any host other than the approved host.
2. Confirm `StudioCreativeProject` exists.
3. Confirm `StudioTimeline` does not exist. If it exists, stop and do not run the SQL again.
4. Confirm no application deploy is in progress.
5. Take a database backup or snapshot that can be restored without dropping unrelated tables.

## Existing schema

The certified Preview and Production databases do not have `StudioTimeline`. Existing film projects, storyboards, scenes, characters, library assets, wallets, and animation rows stay where they are.

## Transaction behavior

Apply the SQL file in one transaction:

```sql
BEGIN;
-- statements from migration.sql
COMMIT;
```

A failure rolls the new tables back. Existing tables are not altered except for the new foreign key on `StudioCreativeProject`, which is added by the timeline table, not by rewriting project rows.

## Data preservation

- No `UPDATE` and no `DELETE`.
- Project titles, storyboard links, scene characters, scene images, wallet balances, and media URLs are untouched.
- The timeline stores references (`sourceKind`, `sourceId`). It does not copy media bytes into new rows.

## Application compatibility

- Old application code does not read these tables. It keeps working before and after the SQL.
- New timeline routes fail until the tables exist. Do not deploy the new application to Preview or Production before this SQL is applied on that database.
- After the SQL, old and new application versions can run. Old versions ignore the tables.

## Rollback

Before any timeline row exists: `DROP TABLE "StudioTimelineClip", "StudioTimelineTrack", "StudioTimeline";`

After creators have saved timelines: do not drop the tables. Ship a forward fix. Dropping them would remove edit decisions, not the media.

## Post-migration verification

1. `\d "StudioTimeline"` shows `projectId` unique and the foreign key to `StudioCreativeProject`.
2. Create one timeline on a disposable project, reload it, then delete that project and confirm the timeline rows go with it.
3. Confirm an unrelated project, wallet balance, and library asset are unchanged.
4. Only then deploy the application that queries the tables.

## Certification

Disposable database `homecheff_timeline_migrate_cert` on `127.0.0.1`, created empty and loaded with the current schema, then the three timeline tables were removed so the run started without `StudioTimeline`.

Result:

- The SQL file contains `CREATE TABLE`, `CREATE INDEX`, and three `ADD CONSTRAINT` foreign keys. It has no `DROP`, `DELETE`, `UPDATE`, or `TRUNCATE`.
- A project, storyboard, scene, library asset, and wallet with balance 40 were inserted before the SQL. Title, storyboard link, scene count, asset count, and wallet balance were the same after the SQL.
- Indexes present: `StudioTimeline_projectId_key`, `StudioTimelineTrack_timelineId_type_language_key`, `StudioTimelineTrack_timelineId_sortOrder_key`, `StudioTimelineClip_track_request_key`, plus the primary keys.
- Three foreign keys exist. They point at `StudioCreativeProject`, `StudioTimeline`, and `StudioTimelineTrack`.
- The application created a timeline and its tracks on the fixture project. The fixture values stayed the same.
- A second apply fails with `relation "StudioTimeline" already exists`. That attempt was inside a transaction and was rolled back. The first tables and the fixture stayed. The SQL is not safe to run twice. Stop if `StudioTimeline` already exists.
- Rollback `DROP TABLE "StudioTimelineClip", "StudioTimelineTrack", "StudioTimeline"` removed only those tables. The fixture project, scene, asset, and wallet remained.
- `_prisma_migrations` was not written.

## This task

Production deployment is not authorized.
Preview schema was not changed.
Preview deployment is blocked until the owner approves this plan for the Preview database.
