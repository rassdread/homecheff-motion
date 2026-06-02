# Instant Premium video worker (Railway / Docker)

Vercel cannot run FFmpeg with `drawtext` reliably. Set **`VIDEO_RENDER_MODE=worker`** on Vercel and run this worker on Railway or Docker.

## Deploy with Dockerfile.worker

```bash
docker build -f Dockerfile.worker -t homecheff-video-worker .
docker run -p 8090:8090 --env-file .env homecheff-video-worker
```

## Railway

1. New service from repo; **Dockerfile path**: `Dockerfile.worker`
2. **Root directory**: repository root (not `worker/ffmpeg-merge-worker`)
3. Set environment (same DB/Blob/Vidu as the Next.js app):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon connection string |
| `BLOB_READ_WRITE_TOKEN` | **Same** Vercel Blob read/write token as the Next.js app (Vercel project → Storage → Blob → token). Wrong or missing token causes final merge upload `EXPORT_UPLOAD_AUTH_FAILED` at ~85–100%. |
| `VIDU_API_KEY` | Vidu API key |
| `ANIMATION_PROVIDER` | `vidu` |
| `VIDU_ENABLE_REAL_CALLS` | `true` |
| `FFMPEG_PATH` | `/usr/bin/ffmpeg` |
| `FFMPEG_FONT_PATH` | `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf` |
| `VIDEO_WORKER_SECRET` | Same value as on Vercel |
| `PORT` | `8090` (Railway sets automatically) |

**RT-DETR object detection** (Story Mode overlay placement) — set on the **worker** (not Vercel):

| Variable | Value |
|----------|--------|
| `HC_ENABLE_OBJECT_SAFE_ZONES` | `1` |
| `HC_OBJECT_DETECTOR_KIND` | `rtdetr` |
| `HC_OBJECT_DETECTOR_MODEL_DIR` | `/app/models/object-detector` |

`Dockerfile.worker` downloads the ONNX at image build (`npm run setup:vision-models -- --include-object-detector`) and sets these env vars by default. For a custom deploy without that Dockerfile step, run the setup script on the host and point `HC_OBJECT_DETECTOR_MODEL_DIR` at the directory.

Optional: `HC_SAFE_ZONE_DEBUG=1` for one export only (logs `layerPlacementReasons`); use `0` in steady-state production.

4. On **Vercel**:

| Variable | Value |
|----------|--------|
| `VIDEO_RENDER_MODE` | `worker` |
| `VIDEO_WORKER_BASE_URL` | `https://your-worker.up.railway.app` |
| `VIDEO_WORKER_SECRET` | Same secret as worker |

## Verify

```bash
curl https://your-worker.up.railway.app/health/video
# ok: true, hasDrawtext: true, fontReadable: true

curl "https://your-worker.up.railway.app/health/vision?probe=1"
# objectDetector.status: READY, runtimeReady: true

curl https://your-app.vercel.app/api/health/video
# mode: worker, ok: true, worker: { ... }
```

Admin (logged in): `GET /api/admin/video/vision-health?probe=1` and `GET /api/admin/video/overlay-engine-status?probe=1` proxy the **worker** when `VIDEO_RENDER_MODE=worker`.

## Endpoints (worker)

- `GET /health/video` — public FFmpeg capability check
- `GET /health/vision?probe=1` — object detector / MediaPipe readiness on this worker
- `POST /jobs/instant-premium/:projectId/process` — `Authorization: Bearer <VIDEO_WORKER_SECRET>`
- `POST /jobs/instant-premium/:projectId/retry-overlay` — same auth
