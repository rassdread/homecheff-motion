# HomeCheff rembg deployment

Deploy the standalone service in `rembg-service/` and point the Next.js app at it with `REMBG_API_URL`.

## Service contract

Matches `src/server/editor/segment-editor-layer.ts`:

```
POST <REMBG_API_URL>
Content-Type: image/jpeg
Body: raw image bytes
→ 200 image/png (RGBA, transparent background)
```

Endpoints:

| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Liveness |
| `/` or `/segment` | POST | Segment image |

Set `REMBG_API_URL` to the **full POST URL**, e.g. `https://homecheff-rembg.up.railway.app/segment`.

## Railway

1. New project → **Deploy from GitHub** → select this repo.
2. **Root directory:** `rembg-service`
3. Railway reads `rembg-service/railway.toml` + `Dockerfile`.
4. Generate domain → copy URL.
5. Set on **Vercel** (Next.js app):

   ```
   REMBG_API_URL=https://<your-service>.up.railway.app/segment
   ```

6. Redeploy Vercel.

**Notes:** First build downloads u2net (~170MB). Use at least 1GB RAM. CPU-only (`rembg[cpu]`).

## Render

**Option A — Blueprint**

1. Render Dashboard → Blueprint → connect repo.
2. Use `rembg-service/render.yaml` (set service root to `rembg-service` if prompted).
3. Health check: `/health`.

**Option B — Manual Docker**

| Setting | Value |
|---------|--------|
| Root directory | `rembg-service` |
| Dockerfile | `Dockerfile` |
| Health check path | `/health` |

Set `REMBG_API_URL=https://<service>.onrender.com/segment` on Vercel.

## Fly.io

```bash
cd rembg-service
fly launch --name homecheff-rembg --region ams --no-deploy
fly deploy
fly certs create   # if using custom domain
```

Set:

```
REMBG_API_URL=https://homecheff-rembg.fly.dev/segment
```

`fly.toml` includes `/health` checks and 120s grace for model warmup.

## Env setup (Next.js / Vercel)

| Variable | Where | Example |
|----------|--------|---------|
| `REMBG_API_URL` | Vercel → Project → Environment Variables | `https://homecheff-rembg.up.railway.app/segment` |

Local dev (`.env.local`):

```
REMBG_API_URL=http://localhost:8080/segment
```

Also documented in `.env.example`.

**Do not** set `REMBG_API_URL` on the video FFmpeg worker — only on the Next.js app.

## Verification

### 1. Service health

```bash
curl -sS https://<rembg-host>/health
# {"ok":true,"service":"homecheff-rembg"}
```

### 2. Direct segment smoke test

```bash
curl -sS -X POST https://<rembg-host>/segment \
  -H "Content-Type: image/jpeg" \
  --data-binary @path/to/photo.jpg \
  -o /tmp/rembg-out.png
file /tmp/rembg-out.png   # PNG image data
```

Or use the repo script:

```bash
REMBG_API_URL=https://<rembg-host>/segment npm run verify:rembg -- path/to/photo.jpg
```

### 3. Editor segment status (authenticated)

Sign in to the app, then:

```bash
curl -sS -b "your-session-cookie" https://<app>/api/editor/segment/status
```

Expect:

```json
{
  "rembgAvailable": true,
  "sam2PreciseSelection": "unavailable",
  ...
}
```

In the browser (logged in): open DevTools → Network → visit Editor → request to `/api/editor/segment/status` → `rembgAvailable: true`.

### 4. Editor end-to-end

1. Open `/editor`, upload Globe Man (or any photo).
2. Click the character — auto-mask should run rembg fallback when SAM2 is unset.
3. Save message should progress; after success, selection contour turns green and Replace becomes available.
4. Or: select background → Remove background → `segmentationSource: "rembg"` in network response from `POST /api/editor/segment`.

### 5. Programmatic segment API

```bash
curl -sS -X POST https://<app>/api/editor/segment \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl":"https://...public-image-url...","sessionId":"test","mode":"refine"}'
```

With `REMBG_API_URL` set, response should include `"segmentationSource":"rembg"` and `"maskUrl":"https://..."`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `rembgAvailable: false` | `REMBG_API_URL` missing or wrong on Vercel; redeploy after env change |
| 502/timeout on rembg service | Increase memory; cold start — retry after `/health` is 200 |
| Heuristic fallback only | rembg POST failed — check service logs; verify POST URL ends with `/segment` |
| Empty mask | Image too large — default max 20MB (`REMBG_MAX_BYTES`) |

## Cost notes

- CPU rembg: suitable for Editor refine + background remove (not real-time video).
- For high volume, scale Railway/Render instances or add queue later.
- SAM2 is a separate future deployment (`SAM2_SEGMENTATION_URL`).
