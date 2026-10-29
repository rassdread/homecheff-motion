# Existing Render services

## Repository

`render.yaml` describes one web service:

- Name: `homecheff-motion`
- Runtime: docker
- Dockerfile: `Dockerfile.worker`
- Health: `/health`
- `FFMPEG_PATH=/usr/bin/ffmpeg`
- Start: `npm run worker`, which is `npx tsx worker/video-worker.ts`

`docs/render-video-worker.md` also describes a native Node setup on Render with the same start command and the public URL `https://homecheff-motion.onrender.com`. Dashboard-only variables named there include `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `VIDEO_WORKER_SECRET`. Values were not read and were not changed.

`rembg-service/render.yaml` is a separate background-removal service. It is not the video encoder.

## Runtime, read-only

`GET https://homecheff-motion.onrender.com/health/video` returned HTTP 200:

- `ok: true`
- `ffmpegPath` is `/usr/bin/ffmpeg`
- `hasDrawtext: true`
- `fontReadable: true`
- `service: instant-premium-video-worker`
- `sourceCommitSha: 4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`
- `errors: []`

That commit does not contain `/jobs/film-timeline`. No job was posted. The service was not restarted and its settings were not changed.

Health: LIVE_WORKER_READ_ONLY_VERIFIED. Film jobs on that live process: absent until a separate worker deploy.
