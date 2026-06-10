# Environment Variable Usage Audit Report

Audit date: 2026-06-10  
Scope: full repository search (read-only).  
Variables: `PUBLIC_BASE_URL`, `ANIMATION_EXPORT_MODE`, `EXTERNAL_MERGE_API_URL`, `EXTERNAL_MERGE_API_KEY`.

---

## PUBLIC_BASE_URL

| Field | Detail |
|-------|--------|
| **References** | `src/lib/public-origin.ts` (primary reader), `src/server/auth/session.ts` (cookie Secure inference), `src/lib/allowed-api-origins.ts` (CORS allowlist), `src/server/video-providers/vidu-config.ts` (`resolvePublicImageUrlForVidu`), `.env.example` (documented) |
| **Indirect consumers** | `getPublicOrigin()` → `src/app/api/admin/invites/route.ts` (invite URLs), `src/app/api/instant-premium/checkout/route.ts` (Stripe redirect URLs), `src/server/animation-export/service.ts` (external merge callback URL) |
| **Used at runtime** | **Yes** — when set, used as canonical public HTTPS/HTTP origin. When unset, code falls back to `VERCEL_URL` → `https://…`, then `http://localhost:3000` (`getPublicOrigin`); Vidu relative URLs also try `VERCEL_URL`; cookies also check `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_VERCEL_URL` before `PUBLIC_BASE_URL` |
| **Production usage** | **Conditional** — on Vercel, `VERCEL_URL` often substitutes. Required for custom domains (e.g. `motion.homecheff.eu`) when `NEXT_PUBLIC_APP_URL` is not set, for correct invite/checkout/merge-callback URLs, CORS, and Vidu absolute image URLs from relative paths |
| **Required** | **Recommended, not strictly mandatory** on Vercel if `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` covers your case. **Required** on non-Vercel production hosts without those fallbacks |
| **Recommended value** | `https://motion.homecheff.eu` (or your canonical production origin, no trailing slash) |
| **Can remove** | **No** — still referenced in live code paths; omitting is OK only when fallbacks are intentionally configured |

---

## ANIMATION_EXPORT_MODE

| Field | Detail |
|-------|--------|
| **References** | `src/server/animation-export/export-config.ts` (`resolveAnimationExportMode`, `assertExternalMergeConfigured`), `src/server/animation-export/service.ts` (`startProjectExport`, `retryProjectExport`, `pollProjectExport`), `.env.example`, `worker/ffmpeg-merge-worker/README.md` |
| **Used at runtime** | **Yes** — when set to `local` or `external`, forces that mode. When **unset**, defaults to `local` in development; in production defaults to `external` if `EXTERNAL_MERGE_API_URL` is set, otherwise `local` |
| **Production usage** | **Optional override** — production Motion export typically uses `external` via auto-detect when `EXTERNAL_MERGE_API_URL` is configured. Explicit `ANIMATION_EXPORT_MODE=external` documents intent; `local` would force in-process FFmpeg on the Next.js host (not recommended on Vercel) |
| **Required** | **No** — auto-resolution from `NODE_ENV` + `EXTERNAL_MERGE_API_URL` is sufficient |
| **Recommended value** | **Unset** (let auto-detect), or `external` in production when using `worker/ffmpeg-merge-worker` |
| **Can remove** | **Yes** (from env) — safe to omit if `EXTERNAL_MERGE_API_URL` is set in production; keep code support |

---

## EXTERNAL_MERGE_API_URL

| Field | Detail |
|-------|--------|
| **References** | `src/server/animation-export/export-config.ts` (auto-detect + validation), `src/server/animation-export/external-merge-client.ts` (`externalMergeBaseUrl` — `POST /merge`, `GET /merge/:jobId`), `src/server/animation-export/service.ts` (external export start/poll/retry), `.env.example`, `worker/ffmpeg-merge-worker/README.md`, `docs/motion-studio-economics-audit.md` |
| **Used at runtime** | **Yes** — required whenever export mode resolves to `external`; throws if missing when external merge runs |
| **Production usage** | **Yes, when using external FFmpeg merge worker** — e.g. Railway-deployed `worker/ffmpeg-merge-worker`. Not used when mode stays `local` |
| **Required** | **Yes for production external merge** — Vercel/serverless should not run heavy FFmpeg merge locally |
| **Recommended value** | `https://<your-merge-worker>.up.railway.app` (public HTTPS base, no trailing slash) |
| **Can remove** | **No** if production relies on external merge. **Yes** only if you intentionally use `ANIMATION_EXPORT_MODE=local` (dev/single-host only) |

---

## EXTERNAL_MERGE_API_KEY

| Field | Detail |
|-------|--------|
| **References** | `src/server/animation-export/export-config.ts` (`getExternalMergeApiKey`), `src/server/animation-export/external-merge-client.ts` (`Authorization: Bearer …` on merge requests), `.env.example`, `worker/ffmpeg-merge-worker/README.md` |
| **Worker counterpart** | Worker uses **`MERGE_WORKER_API_KEY`** (not `EXTERNAL_MERGE_API_KEY`) in `worker/ffmpeg-merge-worker/src/server.ts` — values must match |
| **Used at runtime** | **Yes, when set** — app sends `Authorization: Bearer <key>` on merge API calls. If unset, requests go without auth (worker allows if `MERGE_WORKER_API_KEY` also unset) |
| **Production usage** | **Recommended for secured merge worker** — pair with `MERGE_WORKER_API_KEY` on the worker service |
| **Required** | **No** (technically optional) — **Yes for secure production** when worker enforces API key |
| **Recommended value** | Long random shared secret, identical to worker `MERGE_WORKER_API_KEY` |
| **Can remove** | **Yes** only if worker auth is disabled. **No** for hardened production external merge |

---

## Summary Table

| Variable | References | Used at runtime | Required | Recommended value | Can remove |
|----------|------------|-----------------|----------|-------------------|------------|
| `PUBLIC_BASE_URL` | 5 code files + `.env.example` | Yes (with fallbacks) | Recommended | `https://motion.homecheff.eu` | **No** |
| `ANIMATION_EXPORT_MODE` | `export-config.ts`, `service.ts`, docs | Yes (optional override) | No | Unset or `external` | **Yes** (from env) |
| `EXTERNAL_MERGE_API_URL` | `export-config.ts`, `external-merge-client.ts`, `service.ts`, docs | Yes when external | Yes (prod external merge) | `https://<merge-worker-host>` | **No** (if external merge) |
| `EXTERNAL_MERGE_API_KEY` | `export-config.ts`, `external-merge-client.ts`, docs | Yes when set | No (yes if worker auth on) | Shared secret = `MERGE_WORKER_API_KEY` | **No** (secure prod) |

---

## Related variables (not in scope but coupled)

| Variable | Coupling |
|----------|----------|
| `NEXT_PUBLIC_APP_URL` | Overlaps `PUBLIC_BASE_URL` for cookies/CORS |
| `VERCEL_URL` | Auto-set on Vercel; substitutes for `PUBLIC_BASE_URL` in several paths |
| `MOTION_WORKER_SECRET` | Required in production external export for merge **callback** auth (`assertExternalMergeConfigured`) |
| `MERGE_WORKER_API_KEY` | Worker-side name for the same secret as `EXTERNAL_MERGE_API_KEY` |

---

## Production checklist (HomeCheff Motion)

| Goal | Variables |
|------|-----------|
| Canonical URLs + Vidu + Stripe + invites | `PUBLIC_BASE_URL` or `NEXT_PUBLIC_APP_URL` |
| External FFmpeg merge on Vercel | `EXTERNAL_MERGE_API_URL`, `MOTION_WORKER_SECRET`, `EXTERNAL_MERGE_API_KEY` + worker `MERGE_WORKER_API_KEY` |
| Explicit merge mode | `ANIMATION_EXPORT_MODE=external` (optional) |
