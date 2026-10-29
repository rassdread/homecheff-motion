# Production environment

The Vercel CLI token expired about 9.6 hours before this pass. `GET /v2/user` returned HTTP 403 with `invalidToken: true`. The project endpoint was not called again. `vercel` is not on `PATH`. No new credential was created.

The only local production env copy is `/Users/sergioarrias/HomeCheffProjects/homecheff-motion/.env.production.local`, mtime 2026-09-12. Values were not printed.

| Name | Result |
| --- | --- |
| `HOMECHEFF_IDENTITY_ORIGIN` | UNVERIFIED. The Sept 12 copy stores the placeholder `[SENSITIVE]`. |
| `LEGACY_STUDIO_LOGIN_ENABLED` | UNVERIFIED. Same placeholder. |
| `STUDIO_CENTRAL_HC_SPEND_ENABLED` | UNVERIFIED. Same placeholder. |
| `VIDEO_RENDER_MODE` | `worker` in that copy. Live value not re-decrypted. |
| `VIDEO_WORKER_BASE_URL` | Host `homecheff-motion.onrender.com` in that copy. That host answered health today. The current Vercel value was not re-read. |
| `VIDEO_WORKER_SECRET` | Present in the copy, non-empty. Render's value was not read. Consistency UNVERIFIED. No live job was sent. |
| `FFMPEG_PATH` | Live health reports `/usr/bin/ffmpeg`. The copy and `Dockerfile.worker` use the same path. |
| `FFMPEG_FONT_PATH` | The copy matches the Dockerfile DejaVu path. Live health reports that font readable. |
| Blob token | Present in the copy. Not used. |
| `DATABASE_URL` | Host `ep-wild-morning-alynrf2i`, database `neondb`. Used only for the read-only query in `06_DATABASE_MIGRATION.md`. |

No setting was changed. Renewing Vercel read access is required before anyone treats the three flags as current.
