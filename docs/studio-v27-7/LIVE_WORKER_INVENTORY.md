# Live worker inventory

Read-only. No job was posted. The service was not restarted.

`GET https://homecheff-motion.onrender.com/health` returned HTTP 200.

- `service`: `instant-premium-video-worker`
- `sourceCommitSha`: `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`
- `status`: `ok`

`GET /health/video` returned HTTP 200.

- `ok`: true
- `ffmpegPath`: `/usr/bin/ffmpeg`
- `hasDrawtext`: true
- `fontReadable`: true
- font path classified as DejaVu
- `errors`: empty

That commit message is “Match the file-stream drain callback to the Studio typecheck,” dated 2026-10-07. It is an ancestor of the candidate.

Repository evidence, not a live dashboard read:

- `render.yaml` name `homecheff-motion`, Docker, `Dockerfile.worker`, health `/health`, start `npm run worker`
- `Dockerfile.worker` base `node:20-bookworm`, `apt-get install ffmpeg`, `FFMPEG_PATH=/usr/bin/ffmpeg`
- `docs/render-video-worker.md` also describes a native Node start command. Which of Docker or native Node is the process that answered was not separately proven. The health body matches this worker.

Render deployment id: UNVERIFIED. No Render API credential was used. The Vercel project API returned HTTP 403, so the Studio deployment id was not re-read. The last recorded Studio deployment remains the V27.5 value `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`, classified HISTORICALLY_REPORTED.

Environment values were not printed. Presence of worker secrets on the live service was not re-decrypted in this pass.
