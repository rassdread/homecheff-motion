# Migration execution

Date: 2026-10-19

MIGRATION_EXECUTED = YES

UNAPPROVED_MIGRATIONS_EXECUTED = NO

## Approved SQL

File: `prisma/migrations/20261019153000_studio_scene_dialogue_text/migration.sql`

```sql
ALTER TABLE "StudioScene" ADD COLUMN "dialogueText" TEXT;
```

The file also contains comments. Its SHA-256 is `cfcd37d8009810e1bb3f410818061e7e7ebbd51c36cd9f222ce38ea8804c295f`. That hash matches the checksum stored in `_prisma_migrations`.

## Why `prisma migrate deploy` was not used

Before the change, the only local migration missing from a successful history row was `20261019153000_studio_scene_dialogue_text`.

Two older rows were unfinished and marked rolled back:

- `20260603120000_project_render_version`
- `20260604120000_studio_character`

Those rows were left untouched. `migrate deploy` was not run, so it could not replay them. The approved statement ran inside one transaction, and the tracking row was inserted in that same transaction only after the statement succeeded.

Tracking row:

| Field | Value |
| --- | --- |
| id | `3922f16a-357e-4deb-947b-1a08ab24082e` |
| migration_name | `20261019153000_studio_scene_dialogue_text` |
| checksum | file SHA-256 above |
| applied_steps_count | 1 |
| finished | yes |
| rolled_back | no |

After that insert, `npx prisma migrate status` reported: 79 migrations found in `prisma/migrations`, database schema is up to date. The datasource host was `ep-wild-morning-alynrf2i.c-3.eu-central-1.aws.neon.tech`, database `neondb`.

## Result

`StudioScene.dialogueText` is PostgreSQL `text`, nullable, default null. No new index was added. Existing indexes remain `StudioScene_pkey`, `StudioScene_storyboardId_order_idx`, and `StudioScene_storyboardId_order_key`.

All 130 existing scenes have `dialogueText` null. No backfill ran.
