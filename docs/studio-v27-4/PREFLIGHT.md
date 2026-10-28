# V27.4 preflight

Date of the audit: 2026-10-29.

Repository worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`

Branch: `integrate/studio-unified-film-production`

HEAD at the start of the audit: `dcd0caea75b6d08755c4431ceebc3eba651f10b7`

That is the expected certified commit. No reset, stash, clean, or checkout of this worktree was used.

Tracked files were clean. Untracked files left untouched:

- `.agents/`
- `docs/studio-v16/`
- `docs/studio-v17/`
- `docs/studio-v23-10/`
- `scripts/v2310-*`
- `scripts/v238-auth-browser-cert.ts`
- `scripts/v239-*`
- `skills-lock.json`

Listeners that were already running, and were still running at the end:

- `127.0.0.1:3462`, node PID 61963, cwd this worktree
- `127.0.0.1:3456`, node PID 18083, cwd `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v2732-https` at git HEAD `cffaeb83`

A separate clean worktree was added at `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v274-exact`, detached at `dcd0caea`. Its working tree had no source modifications. An HTTPS server for that tree used port 3457 and was stopped after the certification. Ports 3456 and 3462 were not stopped.

Local Node used for the candidate build: v25.6.1. The Vercel project setting is Node 24.x. Next.js is 16.2.4 on both the live commit and the candidate. No `engines` field is set. Package manager is npm. `package-lock.json` is in the candidate commit.

Origin of this clone is the local path `homecheff-motion-preview-auth`. Nothing was fetched, pushed, or merged.
