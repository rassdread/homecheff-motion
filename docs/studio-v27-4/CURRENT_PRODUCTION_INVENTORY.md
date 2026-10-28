# Current production inventory

Live domain `studio.homecheff.eu` is hosted on Vercel. DNS is a CNAME to `1999bd811fab9bde.vercel-dns-016.com`, answering from `216.150.16.1` and `216.150.1.1`.

This is the Studio project, not the Marketplace.

| Field | Value |
| --- | --- |
| Vercel team | `team_uLKRAoCrEPUQOIcgbyZGt3HG` |
| Project name | `homecheff-motion` |
| Project id | `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f` |
| GitHub repo | `rassdread/homecheff-motion` |
| Linked production branch in project settings | `main` |
| Actual production deployment | `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` |
| Deployment state | `READY` |
| Deployment source | Vercel CLI |
| Deployment commit | `afbbd4cc5e7017ac4dce660793642b855a525ed5` |
| Deployment branch | `feature/passion-character-masters-production` |
| Commit subject | Record the dialogue migration and align stale pack tests. |
| Commit time | 2026-10-19 14:06:41 +0200 |
| Deployment created | 2026-10-19 12:13:34 UTC |
| Deployment ready | 2026-10-19 12:19:47 UTC |
| Region | `fra1` |
| Framework | Next.js |
| Project Node setting | 24.x |
| SSO protection | `all_except_custom_domains` |

Aliases on this one production deployment:

- `studio.homecheff.eu`
- `motion.homecheff.eu`
- `homecheff-motion.vercel.app`
- the project and branch Vercel hostnames

A release of this project changes both `studio.homecheff.eu` and `motion.homecheff.eu`. The Marketplace repository `rassdread/homecheff-app` and `homecheff.eu` were not inspected for deployment and were not modified.

Production database, from the production `DATABASE_URL` host only:

- endpoint `ep-wild-morning-alynrf2i`
- database name `neondb`
- not the pooler host

Preview `DATABASE_URL` is a different endpoint, `ep-purple-moon-al3mm1i3`, database `neondb`. It was identified and not queried.

The isolated V25 endpoint `ep-withered-moon-bapvy24i` was not used.

Read-only counts on the production database:

| Table | Rows |
| --- | --- |
| User | 24 |
| StudioWallet | 18 |
| StudioLedgerEntry | 82 |
| StudioCreativeProject | 3 |
| AnimationProject | 46 |
| EditorCanvasProject | 87 |
| StudioLibraryAsset | 10 |
| StudioSceneImage | 92 |
| StudioTimeline table | absent |

No production row was inserted, updated, or deleted.

Unauthenticated GET results from `https://studio.homecheff.eu` on 2026-10-28 23:30 UTC:

| Path | Status |
| --- | --- |
| `/` | 200 |
| `/login` | 200 |
| `/motion` | 200 |
| `/editor/start` | 200 |
| `/studio` | 200 |
| `/studio/quick-ad` | 200 |
| `/studio/audio/create` | 404 |
| `/studio/experience` | 200 |
| `/projects` | 200 |
| `/api/health` | 404 |
| `/api/studio/projects` | 401 |

The 401 on the projects API is the unauthenticated response, not a broken route. The audio-create 404 matches the live commit: that page is not in `afbbd4cc`. There is no `/api/health` route in the candidate either.
