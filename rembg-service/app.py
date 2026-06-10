"""
HomeCheff rembg HTTP service.

Contract (must match src/server/editor/segment-editor-layer.ts):
  POST <REMBG_API_URL>
  Content-Type: image/jpeg (body may be JPEG or PNG bytes)
  Body: raw image buffer
  Response: image/png — RGBA with subject alpha > 0, background transparent
"""

from __future__ import annotations

import io
import os

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from PIL import Image
from rembg import remove

app = FastAPI(title="HomeCheff rembg", version="1.0.0")

MAX_BYTES = int(os.environ.get("REMBG_MAX_BYTES", str(20 * 1024 * 1024)))


def _segment_image(raw: bytes) -> bytes:
    if len(raw) < 100:
        raise ValueError("Image body too small.")
    if len(raw) > MAX_BYTES:
        raise ValueError(f"Image exceeds {MAX_BYTES} bytes.")

    with Image.open(io.BytesIO(raw)) as img:
        rgb = img.convert("RGB")
        result = remove(rgb)

    if result.mode != "RGBA":
        result = result.convert("RGBA")

    out = io.BytesIO()
    result.save(out, format="PNG")
    png = out.getvalue()
    if len(png) < 100:
        raise ValueError("Segmentation produced empty output.")
    return png


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"ok": True, "service": "homecheff-rembg"})


@app.post("/")
@app.post("/segment")
async def segment_root(request: Request) -> Response:
    try:
        raw = await request.body()
        png = _segment_image(raw)
        return Response(content=png, media_type="image/png")
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    except Exception as exc:
        return JSONResponse({"error": f"Segmentation failed: {exc}"}, status_code=500)
