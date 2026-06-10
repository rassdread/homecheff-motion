# HomeCheff rembg service

Minimal HTTP service for Editor background removal and auto-mask fallback.

## Contract

| Field | Value |
|-------|--------|
| Method | `POST` |
| URL | Set full URL as `REMBG_API_URL` on the Next.js app (e.g. `https://homecheff-rembg.up.railway.app/segment`) |
| Request header | `Content-Type: image/jpeg` |
| Request body | Raw image bytes (JPEG or PNG) |
| Response | `image/png` — RGBA, subject opaque, background transparent |
| Health | `GET /health` → `{"ok":true,"service":"homecheff-rembg"}` |

Compatible with:

- `src/server/editor/segment-editor-layer.ts` (`tryRembgMask`)
- `src/server/instant-premium/foreground-segmentation/segment-foreground.ts` (`tryRembgApi`)

## Local run

```bash
cd rembg-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8080
```

Docker:

```bash
docker build -t homecheff-rembg .
docker run -p 8080:8080 homecheff-rembg
```

Test:

```bash
curl -sS http://localhost:8080/health
curl -sS -X POST http://localhost:8080/segment \
  -H "Content-Type: image/jpeg" \
  --data-binary @../path/to/photo.jpg \
  -o mask.png
```

Full deployment guide: [docs/rembg-deployment.md](../docs/rembg-deployment.md)
