# Migration safety

## Change

| Question | Answer |
|---|---|
| Model change | `StudioScene.dialogueText String?` |
| SQL | `ALTER TABLE "StudioScene" ADD COLUMN "dialogueText" TEXT` |
| Additive | Yes |
| Existing rows | Stay valid. The new value is `NULL` |
| Existing scene text | Not rewritten |
| Project links | Not changed |
| Character master URLs | Not changed |
| Backfill | None |

## Locking

On PostgreSQL 11 and later, adding a nullable column without a default is a catalog change. It does not rewrite `StudioScene` rows. It still takes a brief `ACCESS EXCLUSIVE` lock while the catalog updates. That lock waits for open transactions on the table and blocks new ones until it commits. The expected window is short because there is no table rewrite. This was not measured on the shared Neon database, because the migration was not run there.

## Backup

No database backup or Neon snapshot was verified for this change. Do not treat a backup as available until someone checks it in the Neon console.

## Reverse

Do not run a down migration. `DROP COLUMN "dialogueText"` would delete any spoken lines saved after the column exists. Existing descriptions, subtitles, narration, masters, and links would remain, but the new text would be gone.

Safe recovery if the application deploy fails after the column exists:

1. Leave the column in place.
2. Point production back at `dpl_2DmsCPV1HMTMHjyC11ugwt61idqJ`.
3. That deployment does not select `dialogueText`, so the extra column is unused.

## Before the migration

The V13 deployment does not read or write the column. Scene save stores description, action, emotion, characters, and the Dutch subtitle. Spoken dialogue is not stored. The form on production still says the line cannot be saved.

## After the migration and the matching deploy

Scene save can store `dialogueText`. Empty text clears it. Description, subtitle, and narration stay separate. The workspace loader selects the column. If the application is deployed before the column exists, that select fails at runtime for every film workspace.

## Order

1. Founder approves this migration.
2. Confirm a backup or snapshot.
3. Apply only this migration to the shared database.
4. Deploy the commit that selects `dialogueText`.
5. If step 4 fails, roll the alias back and leave the column.

Do not reverse those two steps.
