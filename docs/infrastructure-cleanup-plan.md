# Infrastructure Cleanup Plan

Audit date: 2026-06-10  
Scope: categorize workers, env vars, services, endpoints, deployment configs, Render resources.  
**No code changes in this sprint** — operational and future engineering plan only.

---

## Executive summary

| Priority | Action |
|----------|--------|
| **Immediate (ops)** | Disable Render **auto-deploy** on `homecheff-motion` to stop pipeline minute burn |
| **Short term** | Confirm single `VIDEO_WORKER_BASE_URL` host (Render **or** Railway, not both) |
| **Medium term** | Consolidate segmentation on Replicate **or** REMBG — not SAM2 + REMBG + Replicate |
| **Long term** | Retire classic merge worker if `projectType: classic` export has no traffic |

---

## Workers

| Item | Category | Rationale | Evidence |
|------|----------|-----------|----------|
| **Render auto-build on every `main` push** | **SAFE TO REMOVE** (ops toggle) | Burns pipeline minutes; app deploys on Vercel independently | `deployment-trigger-audit.md`, user quota report |
| **Duplicate video worker (Render + Railway)** | **SAFE TO REMOVE** one host | Only one `VIDEO_WORKER_BASE_URL` | `video-render-mode.ts` |
| **Render native Node + Docker dual docs** | **MIGRATE** to single path | `render-video-worker.md` vs `render.yaml` Docker conflict | Pick Docker **or** native, update docs |
| **Video worker process itself** | **KEEP** | Required for IP on Vercel (`VIDEO_RENDER_MODE=worker`) | `wait-for-final-export.ts` |
| **FFmpeg merge worker** | **KEEP** if classic export used; **SAFE TO REMOVE** if zero classic traffic | Only `projectType: classic` | `assertClassicProjectType` |
| **Legacy worker (unnamed)** | **UNKNOWN** → treat as **dead** | No codebase reference | Full repo search |
| **rembg-service** | **KEEP** or **MIGRATE** to Replicate | Optional but wired in Editor + IP | `REMBG_API_URL` |
| **SAM2 external GPU** | **SAFE TO REMOVE** if Replicate click/point ships | Not in monorepo; optional env | `SAM2_SEGMENTATION_URL` |

---

## Environment variables

| Variable | Category | Notes |
|----------|----------|-------|
| `VIDEO_WORKER_BASE_URL` | **KEEP** | Required worker mode |
| `VIDEO_WORKER_SECRET` | **KEEP** | Worker auth |
| `VIDEO_RENDER_MODE=worker` | **KEEP** on Vercel prod | |
| `EXTERNAL_MERGE_API_URL` | **KEEP** or **SAFE TO REMOVE** | Remove only if classic export retired |
| `EXTERNAL_MERGE_API_KEY` | **KEEP** with merge worker | |
| `MOTION_WORKER_SECRET` | **KEEP** with merge worker | Callback auth |
| `ANIMATION_EXPORT_MODE` | **SAFE TO REMOVE** from env | Auto-detect sufficient | `export-config.ts` |
| `REMBG_API_URL` | **KEEP** or **MIGRATE** | Drop after Replicate wired to `segment-editor-layer.ts` |
| `SAM2_SEGMENTATION_URL` | **SAFE TO REMOVE** | When Replicate replaces click segment |
| `REPLICATE_API_TOKEN` | **KEEP** / expand | Admin + prompt; future primary segmentation |
| `HC_OBJECT_DETECTOR_*` on Vercel | **OPTIONAL** | Editor detect uses local ONNX; worker needs for safe zones |
| `PUBLIC_BASE_URL` | **KEEP** | Canonical URLs | `environment-variable-usage-audit-report.md` |

---

## Services (hosted)

| Service | Category | Action |
|---------|----------|--------|
| **Vercel (main app)** | **KEEP** | Primary Studio/Editor/Motion |
| **Render `homecheff-motion`** | **KEEP** (runtime) / **MIGRATE** deploy policy | Keep service; stop auto-build |
| **Render `homecheff-rembg`** | **KEEP** or **MIGRATE** to Replicate | Cost vs volume |
| **Railway video worker** | **SAFE TO REMOVE** if duplicate of Render | |
| **Railway merge worker** | **KEEP** or **SAFE TO REMOVE** | Classic export only |
| **Neon/Postgres** | **KEEP** | `DATABASE_URL` |
| **Vercel Blob** | **KEEP** | Storage contract across app + workers |
| **Vidu API** | **KEEP** | Motion generation |
| **Replicate API** | **KEEP** | Segmentation consolidation candidate |

---

## Endpoints

| Endpoint | Category | Notes |
|----------|----------|-------|
| Video worker `/jobs/instant-premium/*` | **KEEP** | Core IP |
| Video worker `/jobs/language-export/*` | **KEEP** | Language export |
| Video worker `/health/*` | **KEEP** | Ops |
| Merge worker `POST /merge` | **KEEP** or **DEAD** | Classic only |
| `POST /api/publish/export` | **UNKNOWN** prod viability | **MIGRATE** to worker FFmpeg or client-side export |
| `POST /api/editor/segment/click` (SAM2) | **MIGRATE** → Replicate | When SAM2 host removed |
| Admin Replicate lab | **KEEP** | Verification |

---

## Deployment configs

| File | Category | Action |
|------|----------|--------|
| Root `render.yaml` | **KEEP**; disable auto-deploy in dashboard | Blueprint for video worker |
| `Dockerfile.worker` | **KEEP** | Worker image |
| `rembg-service/render.yaml` | **KEEP** or remove if Replicate-only | |
| `rembg-service/railway.toml`, `fly.toml` | **KEEP** as options | |
| `worker/ffmpeg-merge-worker/` | **KEEP** or archive | Classic export |
| Missing Vercel Ignored Build Step | **MIGRATE** add in dashboard | Skip builds for worker-only commits |
| Missing `.github/workflows` | **UNKNOWN** | No CI path filters in repo |

---

## Render resources (specific)

| Resource | Category | Recommendation |
|----------|----------|----------------|
| **Pipeline minutes / auto-deploy** | **SAFE TO REMOVE** behavior | Manual worker deploys |
| **`homecheff-motion` web service** | **KEEP** | Still needed if env URL points here |
| **Second Blueprint (rembg)** | **KEEP** if REMBG kept | |
| **Starter plan always-on** | **KEEP** for worker | Cold start breaks long FFmpeg jobs |
| **Native Node build path in docs** | **MIGRATE** | Align with Docker `render.yaml` |

---

## Phased plan

### Phase 0 — Immediate (no code)

1. Render Dashboard → `homecheff-motion` → **disable Auto-Deploy**.
2. Inventory env: `VIDEO_WORKER_BASE_URL`, `EXTERNAL_MERGE_API_URL`, segmentation URLs.
3. Decommission duplicate worker host if two URLs exist in old docs/secrets.

### Phase 1 — Deploy hygiene (no product change)

1. Vercel Ignored Build Step for `worker/`, `rembg-service/`, `docs/` only changes.
2. Document single worker deploy runbook (manual trigger).
3. Align `render-video-worker.md` with active Docker vs native method.

### Phase 2 — Segmentation consolidation (future code)

1. Wire Replicate to `segment-editor-layer.ts` + IP `segment-foreground.ts`.
2. Remove `REMBG_API_URL` + shutdown `homecheff-rembg` if volume fits Replicate economics.
3. Remove `SAM2_SEGMENTATION_URL` when click/point works via Replicate.

### Phase 3 — Export path simplification (future code + product)

1. Measure classic `projectType: classic` export usage in DB.
2. If zero: remove merge worker env vars and Railway merge service.
3. Wire Publish export to video worker or document as preview-only on Vercel.

### Phase 4 — Optional host migration

1. Move video worker Render → Railway/Fly if better pricing/uptime.
2. Update `VIDEO_WORKER_BASE_URL` only — no code change.

---

## Risk matrix

| Removal | Risk | Mitigation |
|---------|------|------------|
| Render auto-deploy | Stale worker until manual deploy | Deploy worker when `worker/**` changes |
| Merge worker | Classic export breaks | Confirm analytics / DB project types |
| REMBG host | Editor bg remove → heuristic | Enable Replicate first |
| SAM2 URL | Precise Select breaks | Keep until Replicate parity |
| Video worker entirely | **Instant Premium broken on Vercel** | **Do not remove** while on Vercel |

---

## UNKNOWN items (need dashboard / metrics)

1. Live `VIDEO_WORKER_BASE_URL` and whether it is Render or Railway.
2. Whether `EXTERNAL_MERGE_API_URL` is set in production Vercel.
3. Classic vs instant_premium project ratio (last 90 days).
4. Whether Publish export is used in production.
5. Whether SAM2 or REMBG URLs are set in production Vercel env.

---

## Success criteria mapping

| Sprint question | Answer from audits |
|-----------------|-------------------|
| Is Render still required? | **Not strictly** — but **a video worker is required**; Render is current documented host |
| Which worker is actually used? | **Video worker** for IP; **merge worker** for classic; both env-gated |
| Which builds waste pipeline minutes? | **Render video worker** auto-build on every commit |
| Can Replicate replace SAM2/REMBG? | **Not without code**; technically feasible for both |
| What can be removed? | Auto-deploy, duplicate hosts, optional SAM2/REMBG after migration |
| Cheapest viable architecture? | **Vercel + one manual-deploy video worker + Replicate segmentation** |

---

## Related deliverables

1. `homecheff-production-architecture-audit.md`
2. `render-dependency-audit.md`
3. `deployment-trigger-audit.md`
4. `worker-reality-audit.md`
5. `infrastructure-cost-audit.md`
6. `segmentation-platform-audit.md`
7. `infrastructure-cleanup-plan.md` (this document)
