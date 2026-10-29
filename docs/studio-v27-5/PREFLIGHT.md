# V27.5 preflight

Date: 2026-10-29. No production change was made during preflight.

## Repository

- Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`
- Branch: `integrate/studio-unified-film-production`
- Starting HEAD: `cf82ce27ce25fcca5b5403ac96f8c4f278c6d9bb` (V27.4 documentation)
- Application parent: `dcd0caea75b6d08755c4431ceebc3eba651f10b7`
- Remote was not pulled. Nothing was reset, stashed, or cleaned.

Preserved untracked files stayed unstaged: `.agents/`, `docs/studio-v16/`, `docs/studio-v17/`, `docs/studio-v23-10/`, `scripts/v2310-*`, `scripts/v238-auth-browser-cert.ts`, `scripts/v239-*`, `skills-lock.json`.

## Servers left running

- `127.0.0.1:3456` PID 18083
- `127.0.0.1:3462` PID 61963

The certification server used a new port, `127.0.0.1:3458`, and was stopped afterward. Those two listeners were still present.

## Live project, revalidated

- Project `homecheff-motion`, `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`
- Production deployment `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`, state READY
- Commit `afbbd4cc5e7017ac4dce660793642b855a525ed5`
- Domains on the project: `studio.homecheff.eu`, `motion.homecheff.eu`, `homecheff-motion.vercel.app`
- Node setting remains 24.x. This task did not change it.

## Local databases

Disposable PostgreSQL on `127.0.0.1:5432` only. Production credentials were not used.

- `homecheff_film_cert_2u` for browser and billing tests
- `homecheff_film_cert_v24` and `homecheff_timeline_migrate_cert` for the existing integration tests
- `homecheff_v275_timeline_rehearsal` created for this rehearsal

`nvm` default alias remains `22`. The Node 24 checks used `/Users/sergioarrias/.nvm/versions/node/v24.22.2/bin/node` explicitly.
