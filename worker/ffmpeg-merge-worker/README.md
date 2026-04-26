# FFmpeg merge worker (reference)

Minimal Express service that matches the app’s **external merge** API:

- `POST /merge` — queue a concat job (body: `projectId`, `videos[]` with `id`, `order`, `url`, optional `outputFilename`)
- `GET /merge/:jobId` — job status, `progress`, `outputVideoUrl`, `errorMessage`

## Run locally

```bash
cd worker/ffmpeg-merge-worker
npm install
npm run dev
```

Defaults: `PORT=8787`, `WORKER_PUBLIC_URL=http://localhost:8787`.

**Railway:** set `PORT` is injected automatically; the server listens on **`0.0.0.0:${PORT}`** so the proxy can reach it. Set **`WORKER_PUBLIC_URL`** to your public HTTPS URL (e.g. `https://your-service.up.railway.app`) so merge output links are correct. `GET /` returns `{ "status": "ok", "service": "ffmpeg-merge-worker" }` for health checks.

Point the Next.js app at it (server-side only):

```bash
ANIMATION_EXPORT_MODE=external
EXTERNAL_MERGE_API_URL=http://localhost:8787
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

## Security

When `MERGE_WORKER_API_KEY` is set, both `POST /merge` and `GET /merge/:jobId` require `Authorization: Bearer <key>`. Do not expose this key to the browser; only the Next.js server should call the worker.

## Deploy later

1. Build a container or Node service with FFmpeg installed.
2. Set env: `PORT`, `WORKER_PUBLIC_URL` (public HTTPS origin of this service), optional `MERGE_WORKER_API_KEY`, optional `BLOB_READ_WRITE_TOKEN`, optional `FFMPEG_PATH`.
3. In Vercel: `EXTERNAL_MERGE_API_URL=https://your-worker.example.com`, `EXTERNAL_MERGE_API_KEY` matching the worker, `ANIMATION_EXPORT_MODE=external`.

Vercel does not reliably provide FFmpeg for heavy merge workloads; keep merge off the serverless runtime in production.
