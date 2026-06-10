# REMBG Deployment Report

Sprint date: 2026-06-10

## Service Contract

| Item | Specification |
|------|----------------|
| Client | `src/server/editor/segment-editor-layer.ts` → `tryRembgMask()` |
| Method | `POST` |
| URL | Full path stored in `REMBG_API_URL` |
| Request | `Content-Type: image/jpeg`, body = raw image bytes |
| Response | `image/png`, RGBA, transparent background (alpha used for bbox + cutout) |
| Timeout | 45s client-side |
| Success signal | `segmentationSource: "rembg"`, `maskUrl` set, `alphaMask: true` |

Implementation: `rembg-service/app.py` (FastAPI + `rembg[cpu]`).

## Deployment Option

| Platform | Config file | Recommended URL |
|----------|-------------|-----------------|
| **Railway** | `rembg-service/railway.toml` + `Dockerfile` | `https://<app>.up.railway.app/segment` |
| **Render** | `rembg-service/render.yaml` | `https://<app>.onrender.com/segment` |
| **Fly.io** | `rembg-service/fly.toml` | `https://<app>.fly.dev/segment` |
| **Local** | `uvicorn app:app --port 8080` | `http://localhost:8080/segment` |

Guide: `docs/rembg-deployment.md`

## Env Setup

**Next.js / Vercel** (required):

```
REMBG_API_URL=https://<rembg-host>/segment
```

**Local:** `.env.local` with same variable.

Documented in `.env.example` under Editor segmentation.

**Not required on:** video worker (`Dockerfile.worker`), rembg service itself.

## Verification

1. **Service:** `curl https://<host>/health`
2. **Contract:** `REMBG_API_URL=... npm run verify:rembg -- photo.jpg`
3. **App status (signed in):** `GET /api/editor/segment/status` → `rembgAvailable: true`
4. **Editor:** upload image → click object → auto-mask rembg path → green contour + Replace enabled
5. **API:** `POST /api/editor/segment` with public `sourceUrl` → `segmentationSource: "rembg"`

## Test Result

| Check | Status |
|-------|--------|
| `rembg-service/` FastAPI + Dockerfile | Added |
| Contract tests `rembg-service-contract.test.ts` | Added |
| `.env.example` | Updated |
| Editor UX | Unchanged |
| SAM2 | Not added |
| Live cloud deploy | **Operator step** — run Railway/Render/Fly from `rembg-service/` |
| Live `verify:rembg` against cloud | Pending until `REMBG_API_URL` points at deployed host |

Automated repo tests: `src/lib/rembg-service-contract.test.ts` (static contract + env gate).
