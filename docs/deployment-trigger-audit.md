# Deployment Trigger Audit

Audit date: 2026-06-10  
Scope: what GitHub pushes trigger builds — evidence from repository configs only (no Vercel/Render dashboard access).

---

## Summary

| Platform | Trigger source in repo | Typical trigger (expected) | Builds on every `main` push? |
|----------|------------------------|----------------------------|------------------------------|
| **Vercel** | No `vercel.json`; standard Next.js `package.json` `build` | Git integration → production branch | **Yes** (if project linked to repo) |
| **Render — video worker** | Root `render.yaml` + `Dockerfile.worker` | Blueprint sync / auto-deploy | **Yes** (if auto-deploy enabled) — **pipeline minute risk** |
| **Render — rembg** | `rembg-service/render.yaml` | Separate Blueprint (subdir deploy) | **Only if** second Blueprint connected |
| **Railway — merge worker** | `worker/ffmpeg-merge-worker/package.json` | Manual Railway service config | **Depends on dashboard** — not in git |
| **Railway — video worker** | `Dockerfile.worker` (docs) | Manual service config | **Depends on dashboard** |
| **GitHub Actions** | **None** | `.github/` absent | **No CI workflows in repo** |

---

## Vercel (main HomeCheff Studio application)

### Evidence

- `package.json` scripts:
  - `"build": "npm run check:no-ffmpeg-static-in-app && next build"`
  - `"postinstall": "prisma generate"`
- No `vercel.json`, no `vercel.*.json` in repository.
- `src/lib/video-ffmpeg-runtime.ts` detects `VERCEL` / `VERCEL_ENV` — confirms Vercel is the intended app host.

### Expected settings (not in git — verify in Vercel Dashboard)

| Setting | Expected for HomeCheff |
|---------|------------------------|
| **Git repository** | Connected to this monorepo |
| **Production branch** | `main` (or team default) |
| **Root directory** | `/` (repo root) |
| **Build command** | Default `npm run build` (or override matching `package.json`) |
| **Install command** | `npm ci` / `npm install` |
| **Ignored build step** | Not defined in repo — **every push likely builds** unless configured in dashboard |

### What triggers a Vercel build

- Push to linked production branch (`main`).
- Push to preview branches (if preview deployments enabled).
- Manual redeploy from dashboard.

### Unnecessary build paths on Vercel

| Change type | Needs Vercel build? |
|-------------|---------------------|
| Editor / Studio / Motion UI only | **Yes** (same app) |
| `worker/video-worker.ts` only | **No** — but Vercel still builds unless Ignored Build Step excludes worker-only diffs |
| `rembg-service/` only | **No** — separate service; Vercel builds anyway without path filter |
| `docs/` only | **No** — Vercel builds unless dashboard "Skip builds" for docs |
| `prisma/schema` change | **Yes** |

**Recommendation (dashboard, not code):** Add Vercel **Ignored Build Step** to skip when only `worker/`, `rembg-service/`, or `docs/` change — **not implemented in repo today**.

---

## Render (video worker — `homecheff-motion`)

### Evidence

```1:28:render.yaml
# Render Blueprint — Instant Premium video worker (FFmpeg + RT-DETR)
# https://homecheff-motion.onrender.com
services:
  - type: web
    name: homecheff-motion
    runtime: docker
    dockerfilePath: ./Dockerfile.worker
    dockerContext: .
    healthCheckPath: /health
```

- Build inside Docker: `npm ci`, `npm run setup:vision-models -- --include-object-detector --kind=rtdetr`, full repo `COPY . .`
- `docs/render-video-worker.md` alternate path: native Node `npm ci && npm run build:worker` — **heavy build** (downloads RT-DETR ONNX).

### Expected Render settings

| Setting | Value |
|---------|--------|
| **Repo connection** | Same GitHub repo |
| **Branch** | Typically `main` |
| **Auto-deploy** | On commit (default Render behavior when enabled) |
| **Blueprint** | Synced from `render.yaml` |

### What triggers a Render build

- **Every push to tracked branch** when auto-deploy is on.
- Manual deploy / Blueprint sync.
- Env var change (redeploy).

### Pipeline minute impact (user-reported)

- Included minutes exhausted (1003/1000) — **deploy failures are quota, not compile errors**.
- Worker Docker build runs `npm ci` + vision model download + `next build` — **expensive per commit**.
- **Recent Editor/Motion commits may not reach Render** if builds are queued/blocked — Vercel may still deploy app code while worker stays on old image.

### Unnecessary Render builds

| Commit changes | Needs Render worker rebuild? |
|----------------|------------------------------|
| `src/components/editor/**` | **No** |
| `src/app/studio/**` | **No** |
| `docs/**` | **No** |
| `worker/video-worker.ts` or instant-premium merge | **Yes** |
| `Dockerfile.worker` | **Yes** |
| `package.json` dependencies for worker | **Yes** |

**Recommendation:** Disable auto-deploy on Render worker; deploy worker **manually** or on path-filtered CI (no CI in repo today).

---

## Render (rembg — `homecheff-rembg`)

### Evidence

- `rembg-service/render.yaml` — separate Blueprint, `dockerfilePath: ./Dockerfile`, context `rembg-service/`.
- Only builds when a **second Render service** is created from that file.

### Trigger

- Pushes affecting `rembg-service/**` if auto-deploy linked to that subtree (Render root directory must be `rembg-service` or Blueprint-specific).

---

## Railway workers

### FFmpeg merge worker

- `worker/ffmpeg-merge-worker/README.md` — **Root Directory must be** `worker/ffmpeg-merge-worker`.
- Build: `npm run build` (`tsc` → `dist/server.js`).
- **Not defined in git** — Railway watches repo per dashboard config.

### Video worker (alternative to Render)

- `docs/railway-video-worker.md` — Dockerfile path `Dockerfile.worker`, repo root.
- Same image as Render; **mutually exclusive** production URL in `VIDEO_WORKER_BASE_URL`.

### Trigger (expected)

- Railway auto-deploy on push if enabled — typically **full repo** webhook unless path filters configured in dashboard.

---

## Worker builds vs app builds — matrix

| Service | Host | Build command (from repo) | Triggered by git push? |
|---------|------|---------------------------|------------------------|
| Next.js app | Vercel | `next build` | Yes (default) |
| Video worker | Render/Railway/Docker | `build:worker` / Docker image | Yes if auto-deploy |
| Merge worker | Railway | `tsc` in subdir | Dashboard-dependent |
| REMBG | Render/Railway/Fly | Docker in `rembg-service/` | Separate service only |

---

## Branch rules

| Platform | Branch rule in repo | Inference |
|----------|---------------------|-----------|
| Vercel | Not specified | Production = linked branch (likely `main`) |
| Render Blueprint | Not specified | Usually `main` when synced |
| GitHub Actions | N/A | No workflows |

**No monorepo path filters in git** for any platform.

---

## Recommended auto-deploy policy (documentation only)

| Service | Auto-deploy on every commit | Rationale |
|---------|----------------------------|-----------|
| Vercel (app) | **Keep ON** | User-facing Studio/Editor/Motion ship from here |
| Render video worker | **Turn OFF** | Heavy build; changes less frequent than UI |
| Render rembg | **OFF or rare** | Independent release cycle |
| Railway merge worker | **OFF** | Classic export path; infrequent changes |
| Railway video worker | **OFF** if used | Same as Render |

Optional: single **manual workflow** (future) — deploy worker when `worker/**` or `Dockerfile.worker` changes.

---

## Verification checklist (dashboard)

1. Vercel → Project → Git → Production branch name.
2. Vercel → Settings → Ignored Build Step (currently likely empty).
3. Render → `homecheff-motion` → Settings → Auto-Deploy on/off.
4. Render → Build filters (if available on plan).
5. Railway → each service → Root Directory + Watch paths.
6. Confirm whether **two** video worker hosts exist (Render + Railway) — only one should receive `VIDEO_WORKER_BASE_URL`.

---

## Related docs

- `render-dependency-audit.md` — what calls the worker after deploy
- `infrastructure-cleanup-plan.md` — SAFE TO REMOVE auto-deploy on Render
