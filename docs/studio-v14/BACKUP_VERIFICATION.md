# Backup verification

Date: 2026-10-19

BACKUP_VERIFICATION = PASSED

Recovery was tested by reading an isolated branch. Production was not overwritten.

## Target

| Item | Value |
| --- | --- |
| Neon organization | `org-weathered-flower-15652984` |
| Neon project | `lively-hill-12198672` (`homecheff-motion`) |
| Region | `aws-eu-central-1` |
| Postgres | 17 |
| Branch | `br-summer-unit-alsnfcyd` (`production`, primary) |
| Endpoint | `ep-wild-morning-alynrf2i.c-3.eu-central-1.aws.neon.tech` |
| Database | `neondb` |
| Production and preview | Same host, database, and connection identity |

The production and preview `DATABASE_URL` values were compared by host, database name, and port. They match. Credentials are not recorded here.

## Recovery that exists

Neon reports `history_retention_seconds = 86400` on this project. That is a 24-hour point-in-time recovery window for the production branch. The operator can create branches in this project; creating the isolated branch below demonstrated that permission.

## Recovery that was tested

Before the migration, an isolated branch was created from the production branch:

| Item | Value |
| --- | --- |
| Name | `v14-dialogue-pre-migration` |
| Id | `br-round-band-alg7mpq9` |
| Parent LSN | `0/36579218` |
| Created | 2026-10-19T11:51:57Z |
| Expires | 2026-10-21T12:00:00Z |
| Endpoint | `ep-noisy-glade-alwbwt6e.c-3.eu-central-1.aws.neon.tech` |

That branch was queried read-only. Scene, project, storyboard, character, subtitle, and master-image digests matched production. `dialogueText` was absent there, as it was on production before the migration. After the production migration, the same read showed the recovery branch still had no `dialogueText` column and the same counts. Production was not restored onto this branch.

The branch remains until its expiry so the pre-migration copy can be read if needed. It is not a replacement for the 24-hour Neon history window. Restoring production itself was not attempted.

## What was not claimed

A local `pg_dump` was not taken. Vercel does not expose the production database password to this CLI session. The verified mechanisms are the Neon history window and the isolated branch that was actually queried.
