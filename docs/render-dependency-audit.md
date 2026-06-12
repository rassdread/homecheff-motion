# Render Dependency Audit

Audit date: 2026-06-10  
Scope: full-repository search for Render URLs, worker env vars, and runtime callers.  
Method: `rg` across repo + import/call tracing in `src/` and `worker/`.

---

## Search terms — hit summary

| Term | Hits in `src/` (runtime) | Hits in docs/config | Active runtime caller? |
|------|--------------------------|---------------------|------------------------|
| `homecheff-motion.onrender.com` | **0** | `render.yaml`, `docs/render-video-worker.md` | **No hardcode** — only via `VIDEO_WORKER_BASE_URL` if dashboard sets it |
| `VIDEO_WORKER_BASE_URL` | **2 files** | `.env.example`, worker docs | **Yes** — `video-render-mode.ts`, `video-worker-client.ts` |
| `EXTERNAL_MERGE_API_URL` | **2 files** | `.env.example`, merge worker README | **Yes** — classic export only |
| `ANIMATION_EXPORT_MODE` | **1 file** | `.env.example` | **Yes** — `export-config.ts` |
| `external merge` / `external-merge` | Multiple | docs | **Yes** — `external-merge-client.ts`, `service.ts` |
| `worker mode` / `VIDEO_RENDER_MODE` | Multiple | `.env.example` | **Yes** — Instant Premium FFmpeg delegation |
| `merge worker` | 0 in `src/` | `worker/ffmpeg-merge-worker/` | **Yes** — separate service |
| `Render` | 0 URL in `src/` | `render.yaml`, rembg, worker docs | **Deploy target only** |
| `Railway` | 0 URL in `src/` | `docs/railway-video-worker.md`, merge README | **Deploy target only** |
| `onrender.com` | **0** in `src/` | rembg + motion docs | Env-configured only |

---

## 1. What still calls Render?

**Nothing in code calls Render by hostname.** All worker calls use env-based base URLs:

```12:18:src/lib/video-render-mode.ts
export function getVideoWorkerBaseUrl(): string | null {
  const url = process.env.VIDEO_WORKER_BASE_URL?.trim();
  if (!url) {
    return null;
  }
  return url.replace(/\/+$/, "");
}
```

If production Vercel env sets `VIDEO_WORKER_BASE_URL=https://homecheff-motion.onrender.com`, then **every Instant Premium final export** and **language export render** in worker mode calls Render.

### Call graph → Render (when env points there)

| Caller (Vercel) | HTTP client | Worker path | When |
|-----------------|-------------|-------------|------|
| `wait-for-final-export.ts` | `triggerWorkerInstantPremiumProcess` | `POST /jobs/instant-premium/:id/process` | IP final merge |
| `language-export-service.ts` | `triggerWorkerLanguageExport` | `POST /jobs/language-export/:id/render` | Language export FFmpeg |
| `rebuild-final-video.ts` / repair paths | `requestWorkerInstantPremiumProcess` | same | Rebuild / repair |
| `GET /api/admin/video/vision-health` | `fetchWorkerVisionHealth` | `GET /health/vision` | Admin probe |
| `GET /api/admin/video/overlay-engine-status` | `fetchWorkerVideoHealth` | `GET /health/video` | Admin probe |
| `GET /api/health/video` | worker health fetch | `GET /health/video` | App health |

### Separate Render service: REMBG

- `rembg-service/render.yaml` — Blueprint `homecheff-rembg`.
- Vercel calls `REMBG_API_URL` (any host, including `*.onrender.com`) from:
  - `src/server/editor/segment-editor-layer.ts`
  - `src/server/instant-premium/foreground-segmentation/segment-foreground.ts`

**Render builds** (not runtime API calls): root `render.yaml` triggers Docker build of `Dockerfile.worker` on Blueprint sync / auto-deploy.

---

## 2. What endpoints are actively used?

### Video worker (`worker/video-worker.ts`)

| Method | Path | Auth | Called from Vercel? |
|--------|------|------|---------------------|
| GET | `/health` | None | Render health check (`render.yaml` `healthCheckPath`) |
| GET | `/health/video` | None | **Yes** — admin + app health |
| GET | `/health/vision` | None | **Yes** — admin vision probe |
| POST | `/jobs/instant-premium/:projectId/process` | Bearer `VIDEO_WORKER_SECRET` | **Yes** — primary IP merge |
| POST | `/jobs/instant-premium/:projectId/retry-overlay` | Bearer | **Yes** — overlay retry |
| POST | `/jobs/language-export/:exportId/render` | Bearer | **Yes** — language export |

### FFmpeg merge worker (`worker/ffmpeg-merge-worker/src/server.ts`)

| Method | Path | Auth | Called from Vercel? |
|--------|------|------|---------------------|
| GET | `/health`, `/` | None | Platform probes |
| POST | `/merge` | Bearer `MERGE_WORKER_API_KEY` (optional) | **Yes** — `external-merge-client.ts` when classic export external |
| GET | `/merge/:jobId` | Bearer (optional) | **Yes** — export poll |

Callback **from merge worker → Vercel:**

- `POST /api/animations/projects/:id/export/callback` with `x-motion-worker-secret` (`MOTION_WORKER_SECRET`).

### REMBG service (`rembg-service/`)

| Method | Path | Called from Vercel? |
|--------|------|---------------------|
| POST | `/segment` (documented) | **Yes** — Editor + IP foreground |
| GET | `/health` | Deploy verification only |

---

## 3. What endpoints are dead?

| Endpoint / pattern | Status | Evidence |
|--------------------|--------|----------|
| Hardcoded `homecheff-motion.onrender.com` in `src/` | **Dead / never existed** | Zero matches in `src/` |
| `Legacy Worker` service | **Not in repo** | No routes, no README, no env |
| SAM2 on Render | **Not deployed in repo** | Only `SAM2_SEGMENTATION_URL` env to external GPU service; no `sam2-service/` |
| Replicate via Render | **N/A** | Replicate is SaaS API from Vercel |
| Classic export `local` FFmpeg on Vercel | **Effectively dead in prod** | `shouldRunFfmpegLocally()` false when `VERCEL` set |
| `GET /api/admin/render-analytics/export` | **Legacy alias** | Comment: prefer `/admin/render-analytics/export` — still delegates, not dead |

### Doc vs code discrepancy (Render native Node vs Docker)

- `docs/render-video-worker.md` describes **native Node** build (`npm run build:worker`) as "current production setup".
- Root `render.yaml` specifies **`runtime: docker`** + `Dockerfile.worker`.

Both produce the same `video-worker.ts` process; **not dead**, but **two deploy paths** — only one should be active per environment to avoid duplicate builds.

---

## 4. What can be removed?

### Safe to remove from **runtime dependency** (not necessarily delete infra yet)

| Item | Condition |
|------|-----------|
| Render **auto-build on every commit** | If worker image unchanged and deploy is manual — stops pipeline minute burn |
| Duplicate Render service (native + Docker) | Keep one deploy method |
| `EXTERNAL_MERGE_API_*` + merge worker | **Only if** all Motion traffic is Instant Premium (`instant_premium`) and classic export unused |
| `SAM2_SEGMENTATION_URL` | If Replicate SAM3 replaces SAM2 in Editor (not implemented yet) |
| Second worker host (Railway + Render) | If single `VIDEO_WORKER_BASE_URL` suffices |

### Cannot remove without product/code change

| Item | Reason |
|------|--------|
| Video worker (somewhere) | `VIDEO_RENDER_MODE=worker` + Vercel — `merge-instant-project.ts`, `language-export-service.ts` require worker |
| `VIDEO_WORKER_SECRET` | Worker auth on all job POSTs |
| Vidu | `ANIMATION_PROVIDER=vidu` for real motion |
| Vercel Blob token on worker | Final upload paths use `uploadPublicBlob` on worker |

### Env vars — Render-specific vs host-agnostic

| Variable | Render-specific? | Notes |
|----------|------------------|-------|
| `VIDEO_WORKER_BASE_URL` | No | Any HTTPS origin |
| `EXTERNAL_MERGE_API_URL` | No | Any HTTPS origin |
| `REMBG_API_URL` | No | Documented example uses `*.onrender.com` |
| `ANIMATION_EXPORT_MODE` | No | Mode switch only |

---

## File reference index

### `VIDEO_WORKER_BASE_URL` / worker mode

- `src/lib/video-render-mode.ts`
- `src/lib/video-worker-client.ts`
- `src/lib/video-ffmpeg-runtime.ts`
- `src/lib/video-ffmpeg-capability.ts`
- `src/server/instant-premium/wait-for-final-export.ts`
- `src/server/instant-premium/language-export-service.ts`
- `src/server/instant-premium/merge-instant-project.ts`
- `src/server/instant-premium/rebuild-final-video.ts`
- `src/server/instant-premium/full-rerender-project.ts`
- `src/server/instant-premium/finalize-repair.ts`
- `src/server/instant-premium/reconcile-video-repair.ts`
- `src/server/instant-premium/start-instant-video-repair.ts`
- `src/app/api/health/video/route.ts`
- `src/app/api/admin/video/vision-health/route.ts`
- `src/app/api/admin/video/overlay-engine-status/route.ts`
- `src/app/api/instant-premium/projects/[id]/status/route.ts`

### `EXTERNAL_MERGE_API_URL` / classic export

- `src/server/animation-export/export-config.ts`
- `src/server/animation-export/external-merge-client.ts`
- `src/server/animation-export/service.ts`
- `src/server/animation-projects/sync-active-projects.ts`
- `src/app/api/animations/projects/[id]/export/start/route.ts`

### Render deploy config only

- `render.yaml` (root)
- `rembg-service/render.yaml`
- `docs/render-video-worker.md`
- `docs/rembg-deployment.md`

---

## Conclusion

**Render is not hardcoded in application logic.** It is a **documented deployment target** for:

1. `homecheff-motion` (video worker) — **required for Instant Premium on Vercel** when `VIDEO_RENDER_MODE=worker`.
2. `homecheff-rembg` (optional segmentation).

**Render pipeline minutes are consumed by builds**, not by runtime Vidu/Replicate calls. Disabling auto-deploy on worker services does **not** break runtime until the next intentional worker deploy — but blocks shipping worker code changes.

See `infrastructure-cleanup-plan.md` for phased removal/migration.
