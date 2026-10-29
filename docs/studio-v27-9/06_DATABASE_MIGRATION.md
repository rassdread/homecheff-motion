# Database migration

Read-only on 2026-10-29. `BEGIN READ ONLY` against `ep-wild-morning-alynrf2i` / `neondb`. No migration command. No row change.

Newest finished migrations:

- `20261019153000_studio_scene_dialogue_text`
- `20261019143000_studio_voice_characteristic`
- `20261019013000_studio_voice_favorite`
- `20261018190000_studio_voice_catalog`

`20261020120000_studio_timeline` is not applied. `to_regclass('public."StudioTimeline"')` is null. `dialogueText` exists. `StudioVoiceCatalogEntry` exists.

Counts, same as the V27.4 inventory: User 24, StudioWallet 18, StudioLedgerEntry 82, StudioCreativeProject 3, AnimationProject 46, StudioLibraryAsset 10.

The migration file only creates `StudioTimeline`, `StudioTimelineTrack`, and `StudioTimelineClip`, plus indexes and foreign keys. It does not backfill or delete. The project foreign key takes a brief lock on `StudioCreativeProject` (3 rows).

Who needs it:

- Current live worker and current live app do not read these tables.
- Worker `4880f888` boots without them. A film job fails until they exist.
- Studio `4880f888` needs them before a user can save or export a film.

V27.5 applied this migration twice on disposable database `homecheff_v275_timeline_rehearsal`. That remains PREVIOUSLY_CERTIFIED. It was not repeated.

## Backup

Provider is Neon, from the production host. The Neon API token expired about 2.5 days ago, so the point-in-time retention window was not read. Creating a Neon branch is a write and needs its own approval. A full restore is a separate destructive approval and is not the rollback for three empty tables.

Before `prisma migrate deploy`:

1. Re-read this migration list.
2. Record the time and create an approved Neon branch, or record the platform restore timestamp.
3. Read the branch's migration list and the six counts above.
4. Apply only `20261020120000_studio_timeline`.
5. Read the three new tables and confirm the six counts are unchanged.

Do not drop the tables on an application rollback.
