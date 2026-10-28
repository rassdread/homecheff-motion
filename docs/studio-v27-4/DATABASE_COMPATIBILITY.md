# Database compatibility

Production schema history was read with `SELECT` on `_prisma_migrations`. No migration command was executed.

Finished production migrations run through `20261019153000_studio_scene_dialogue_text`. Two older rows are recorded as rolled back and unfinished (`20260603120000_project_render_version` and `20260604120000_studio_character`). The finished copies of those names are also present. `StudioTimeline` does not exist.

The candidate commit `dcd0caea` contains every finished production migration plus one new migration:

`prisma/migrations/20261020120000_studio_timeline/migration.sql`

`prisma/schema.prisma` differs from the live commit `afbbd4cc` only by that addition (63 lines in the schema, 82 lines in the migration).

The migration creates `StudioTimeline`, `StudioTimelineTrack`, and `StudioTimelineClip`, their indexes, and foreign keys to `StudioCreativeProject` and between the new tables. The SQL comment states that existing scenes, assets, and subtitle rows stay in place and that there is no backfill and no media deletion. The statements are `CREATE TABLE`, `CREATE INDEX`, and `ADD CONSTRAINT` on the new tables. There is no `DROP`, no `ALTER` of an existing column, and no data rewrite.

Classification: `ADDITIVE_MIGRATION_REQUIRED`.

Data backfill: not required.

Destructive migration: no.

The candidate film timeline cannot persist until this migration is applied. The rest of the candidate schema matches the current production history.

Locking: creating empty tables does not rewrite customer rows. Adding the foreign key to `StudioCreativeProject` takes a brief lock on that table while the empty child is checked. A backup of `neondb` on `ep-wild-morning-alynrf2i` is still required before anyone applies it. This audit did not take that backup and did not apply the migration.

Rollback of the application does not require dropping these tables. The live commit does not read them. Leaving them in place after a code rollback does not remove users, wallets, projects, or media. Dropping them would be a separate destructive step and is not part of the rollback plan.
