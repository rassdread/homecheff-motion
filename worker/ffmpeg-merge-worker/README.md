# FFmpeg merge worker (reference)

Minimal Express service that matches the app’s **external merge** API:

- `POST /merge` — queue a concat job (body: `projectId`, `exportId`, `jobId`, `callbackUrl` when `MOTION_WORKER_SECRET` is set, `videos[]` with `id`, `order`, `url`, optional `outputFilename`)
- `GET /health` — liveness JSON for Railway / probes
- `GET /merge/:jobId` — job status, `progress`, `outputVideoUrl`, `errorMessage`

## Run locally

```bash
cd worker/ffmpeg-merge-worker
npm install
npm run dev
```

Defaults: `PORT` falls back to **8080** if unset; `WORKER_PUBLIC_URL=http://localhost:<PORT>`.

Set **`MOTION_WORKER_SECRET`** to the same value as on Vercel so the worker can call  
`POST /api/animations/projects/:id/export/callback` with header `x-motion-worker-secret`.  
If the secret is set on the worker, **`callbackUrl`** is required on each `POST /merge` body (the app sends it).

### Railway (monorepo)

1. **Root directory** — In the Railway service → *Settings* → **Root Directory**, set:  
   `worker/ffmpeg-merge-worker`  
   If this stays at the repo root, Railway runs the **Next.js** `package.json` instead: the wrong process never binds to `PORT` → **502 / Application failed to respond**.

2. **Build & start** — `npm run build` runs `tsc` and emits `dist/server.js`. `npm start` runs **`node dist/server.js`** (no `tsx` in production). Nixpacks runs `build` automatically when that script exists.

3. **Port** — `PORT` is set by Railway; the app listens on **`0.0.0.0`**. Invalid `PORT` falls back to **8080**.

4. **Keep the service awake during long merges** — If the platform stops the container right after `202`, FFmpeg never finishes. Prefer **min instances ≥ 1** (or equivalent) for this service.

5. **`WORKER_PUBLIC_URL`** — Set to your public HTTPS origin (e.g. `https://your-service.up.railway.app`) so returned video URLs are correct.

6. **FFmpeg** — Install on the image (custom Dockerfile, Nixpacks `nixPkgs`/`apt`, or a Railway template with ffmpeg) or merges will fail at runtime (the HTTP server will still boot).  
   For **Instant Premium locked text overlays** on the Next.js app (not this worker), the app needs FFmpeg with **drawtext** (libfreetype) plus a readable font (`FFMPEG_FONT_PATH`). Verify: `ffmpeg -filters 2>&1 | grep drawtext`. See root `.env.example` and `GET /api/health/video`.

`GET /` returns `{ "status": "ok", "service": "ffmpeg-merge-worker" }` for health checks.

Point the Next.js app at it (server-side only):

```bash
ANIMATION_EXPORT_MODE=external
EXTERNAL_MERGE_API_URL=http://localhost:8080
EXTERNAL_MERGE_API_KEY=choose-a-shared-secret
```

Set the same value as `MERGE_WORKER_API_KEY` on the worker so it requires `Authorization: Bearer …`.

## Output storage

- If `BLOB_READ_WRITE_TOKEN` is set (same Vercel Blob token as the main app), the worker uploads the final MP4 and returns the public Blob URL.
- Otherwise the file is written under `worker/ffmpeg-merge-worker/outputs/` and served at `GET /outputs/:filename`. The job response uses `WORKER_PUBLIC_URL` to build the public URL.

For production on Railway / Render / Fly.io / a VPS, prefer durable object storage (S3/R2) or Vercel Blob instead of local disk.

**TODO (if Blob is not used):** Configure S3/R2/Vercel Blob for persistent output URLs that survive worker restarts.

## FFmpeg

Install `ffmpeg` on the host or set `FFMPEG_PATH` to the binary path.

Final merge output uses **libx264** with **CRF ~25**, **preset veryfast**, **yuv420p**, **+faststart**, **no audio** (`server.ts` constants — keep roughly aligned with `src/lib/media-export-constants.ts` in the Next.js app). `POST /merge` accepts optional **`exportMaxWidth`** (from project resolution) to cap output width without upscaling.

## Blob cleanup (Next.js app)

Optional env on the **main** app: `ANIMATION_DELETE_TRANSITION_BLOBS_AFTER_FINAL=true` removes transition segment blobs that point at Vercel Blob after the final merge is stored. Admin-wide retention cleanup is still **TODO** (`TODO_ADMIN_CLEANUP_OLD_GENERATED_ASSETS` in `src/lib/media-export-constants.ts`).

## Security

When `MERGE_WORKER_API_KEY` is set, both `POST /merge` and `GET /merge/:jobId` require `Authorization: Bearer <key>`. Do not expose this key to the browser; only the Next.js server should call the worker.

## Deploy later

1. Build a container or Node service with FFmpeg installed.
2. Set env: `PORT`, `WORKER_PUBLIC_URL` (public HTTPS origin of this service), optional `MERGE_WORKER_API_KEY`, optional `BLOB_READ_WRITE_TOKEN`, optional `FFMPEG_PATH`.
3. In Vercel: `EXTERNAL_MERGE_API_URL=https://your-worker.example.com`, `EXTERNAL_MERGE_API_KEY` matching the worker, `ANIMATION_EXPORT_MODE=external`.

Vercel does not reliably provide FFmpeg for heavy merge workloads; keep merge off the serverless runtime in production.
