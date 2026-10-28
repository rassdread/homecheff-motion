# V27.3.1 preflight

Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`

Branch: `integrate/studio-unified-film-production`

Starting HEAD: `c3353da00bdcc614c3970b2e0f696b6c486b7c78`

That commit is the V27.3 film-workflow integration. It was not reset, rebased, or pushed.

Untracked files that were already present and were left unstaged:

- `.agents/`
- `docs/studio-v16/`
- `docs/studio-v17/`
- `docs/studio-v23-10/`
- `scripts/v2310-*`
- `scripts/v238-auth-browser-cert.ts`
- `scripts/v239-*`
- `skills-lock.json`

No stash, clean, or overwrite of that work.

## Database

Primary certification database:

`postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test`

Checked with `current_database()`, `inet_server_addr()` `127.0.0.1`, port `5432`.

Synthetic users only: `v272-user-a@studio.local.test`, `v272-user-b@studio.local.test`, `v272-user-c@studio.local.test`.

The existing local certification databases `homecheff_film_cert_2u`, `homecheff_film_cert_v24`, and `homecheff_timeline_migrate_cert` were not deleted and were not pointed at production.

The port-3456 script was aimed only at `homecheff_film_cert_2u` on `127.0.0.1`.

## Server

The disposable studio server stayed on `http://127.0.0.1:3462` with `STUDIO_DISPOSABLE_LOCAL_AUTH=true`, `STUDIO_LOCAL_MEDIA_DIR=/tmp/homecheff-studio-v27-2-media`, and an empty blob token. It was restarted once after it stopped answering, with the same local database. It was not retargeted.

No production, certified-preview, or isolated V25 database was written. No deploy, push, or merge was performed.
