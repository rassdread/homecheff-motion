# V27.3 preflight

Checked before the workflow edits. Nothing was reset, stashed, cleaned, pushed, merged, or deployed.

| Check | Result |
| --- | --- |
| Worktree | `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified` |
| Branch | `integrate/studio-unified-film-production` |
| HEAD at start | `d46ca5b0f4c0e489fdb19e824d088f8d7f59323e` |
| Remote pull | Not run. The task forbids changing the shared branch state, and this worktree's origin is a local path. |
| Protected `homecheff-motion` | `df7c2939` on `feature/passion-character-masters-preview` |
| Protected passion-prod | `64da73a3` on `feature/passion-character-masters-production` |
| Protected film-links | `bca1692b` on `integrate/studio-film-project-character-links` |
| Protected preview-auth | `1013dab9` on `fix/studio-preview-local-auth` |

Untracked files left unstaged: `.agents/`, `docs/studio-v16/`, `docs/studio-v17/`, `docs/studio-v23-10/`, `scripts/v2310-*`, `scripts/v238-auth-browser-cert.ts`, `scripts/v239-*`, `skills-lock.json`.

## Database

`psql` to `127.0.0.1:5432` reported:

- `current_database()` = `homecheff_studio_v27_2_test`
- `inet_server_addr()` = `127.0.0.1`
- port `5432`

Users present are the disposable local accounts only (`v272-user-a/b/c@studio.local.test` and `legacy-owner@homecheff.local`). No `neon.tech` host. The protected Neon endpoints were not used.

Dev server already listening on `127.0.0.1:3462` with `STUDIO_DISPOSABLE_LOCAL_AUTH=true`, `STUDIO_LOCAL_MEDIA_DIR=/tmp/homecheff-studio-v27-2-media`, and an empty blob token. It was not restarted and not pointed at another database.

## Other local databases

`homecheff_film_cert_2u`, `homecheff_film_cert_v24`, and `homecheff_timeline_migrate_cert` already existed on `127.0.0.1`. Every `User.email` in those three databases ends in `@example.test`. They were not created in the cloud and were not migrated again. See `DATABASE_INTEGRATION_TESTS.md`.
