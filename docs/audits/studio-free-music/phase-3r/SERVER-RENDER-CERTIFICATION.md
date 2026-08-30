# Phase 3R — Server Render Certification

**SERVER_RENDER_APPLICABILITY = NOT_APPLICABLE**  
**SERVER_RENDER = NOT_APPLICABLE**

**AUTOMATIC_FINALIZATION_APPLICABILITY = NOT_APPLICABLE**  
**AUTOMATIC_FINALIZATION = NOT_APPLICABLE**

## Product mode under certification

Quick Video / Photo Video Creator (`/studio/photo-video`) with Free Music catalog beds.

## Actual export route

**FREE_LOCAL_ONLY** — `runLocalExport()` → `encodePhotoVideoLocal()` (WebCodecs + mediabunny in-browser).

Catalog masters: server-authoritative  
`GET /api/studio/free-music/asset/{trackId}?kind=master`  
(credentials required; client audio URL spoof already PASS).

## Why NOT_APPLICABLE

`/api/photo-video/*` provides upload/handoff only — **no** server ffmpeg / render-job / `finalVideoUrl` pipeline for this product.

Instant Premium / Motion server render + automatic finalization are **different product surfaces** and are out of Free Music Phase 3 scope.

Inventing or forcing a server-render cert for Quick Video would create artificial scope.

## Architecture evidence

See `RENDER-ARCHITECTURE-APPLICABILITY.md`.

**FORBIDDEN_REPAIR_POST_COUNT = 0**
