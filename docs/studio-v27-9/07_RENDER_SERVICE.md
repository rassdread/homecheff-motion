# Render service

Read-only on 2026-10-29. The service was not restarted and received no job.

`GET https://homecheff-motion.onrender.com/health` HTTP 200.

- `status`: `ok`
- `service`: `instant-premium-video-worker`
- `sourceCommitSha`: `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`

`GET /health/video` HTTP 200.

- `ffmpegPath`: `/usr/bin/ffmpeg`
- `hasDrawtext`: true
- `fontReadable`: true
- font path is the Dockerfile DejaVu path
- `errors`: empty

That health check runs `ffmpeg -filters`. It does not list encoders. Live H.264 and AAC stay UNVERIFIED. No live encode was run. No new public route was added.

`git grep` on `4f6ca34a` finds no `film-timeline` string in `worker/video-worker.ts`.

`RENDER_DEPLOYMENT_ID = UNVERIFIED`. No Render API credential is on this machine. `render.yaml` names the service `homecheff-motion`, runtime Docker, `dockerfilePath: ./Dockerfile.worker`, health `/health`. Which dashboard deployment id is current was not read.

Rollback commit, revalidated by today's health body: `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`.
