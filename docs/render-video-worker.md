# Instant Premium video worker (Render — native Node)

Vercel delegates FFmpeg merge/overlay to an external worker when `VIDEO_RENDER_MODE=worker`.

Production worker URL: `https://homecheff-motion.onrender.com`

## Render native Node (current production setup)

Render runs as a **native Node** service with root `/opt/render/project/src`. ONNX weights are gitignored and must be downloaded during the **build** via `build:worker`.

### Dashboard settings

| Setting | Value |
|---------|--------|
| **Build command** | `npm ci && npm run build:worker` |
| **Start command** | `npm run worker` |

`build:worker` runs:

```bash
npm run setup:vision-models -- --include-object-detector --kind=rtdetr && npm run build
```

This writes:

```
/opt/render/project/src/models/object-detector/rtdetr.onnx
/opt/render/project/src/models/object-detector/model.json
```

Do **not** set `HC_OBJECT_DETECTOR_MODEL_DIR=/app/models/object-detector` on native builds (that path is Docker-only).

### Required env (worker)

| Variable | Value |
|----------|--------|
| `HC_ENABLE_OBJECT_SAFE_ZONES` | `1` |
| `HC_OBJECT_DETECTOR_KIND` | `rtdetr` |
| `DATABASE_URL` | Neon |
| `BLOB_READ_WRITE_TOKEN` | Same as Vercel app |
| `VIDU_API_KEY` | Vidu |
| `VIDEO_WORKER_SECRET` | Same as Vercel |
| `ANIMATION_PROVIDER` | `vidu` |
| `VIDU_ENABLE_REAL_CALLS` | `true` |

On Vercel: `VIDEO_RENDER_MODE=worker`, `VIDEO_WORKER_BASE_URL=https://homecheff-motion.onrender.com`.

### Build log (success)

```
[setup:vision] download started
[setup:vision] download completed
[setup:vision] model path: .../models/object-detector/rtdetr.onnx
[setup:vision] model size: ... bytes
[setup:vision] model ready: .../models/object-detector/rtdetr.onnx
```

If download fails, the build exits non-zero.

## Alternative — Docker (`render.yaml` + `Dockerfile.worker`)

See `render.yaml` for Docker deployment. `Dockerfile.worker` downloads RT-DETR at image build and sets `HC_OBJECT_DETECTOR_MODEL_DIR=/app/models/object-detector`.

## Verify after deploy

```bash
curl "https://homecheff-motion.onrender.com/health/vision?probe=1"
# objectDetector.status: READY, modelPresent: true, runtimeReady: true

curl "https://homecheff-motion.onrender.com/health/video"
# ok: true, hasDrawtext: true
```

Admin (logged in on Vercel app):

- `GET /api/admin/video/vision-health?probe=1` → `source: video-worker`, `objectDetector.status: READY`
- `GET /api/admin/video/overlay-engine-status?probe=1` → Object Detection READY, score ~80+

Local audit:

```bash
npm run setup:vision-models -- --include-object-detector --kind=rtdetr
HC_ENABLE_OBJECT_SAFE_ZONES=1 npm run test:vision-smoke
```
