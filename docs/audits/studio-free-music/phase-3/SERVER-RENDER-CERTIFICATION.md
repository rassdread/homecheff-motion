# Server Render Certification

**Status:** N/A for Quick Video surface + authority PASS

## Product reality

HomeCheff **Quick Video / Photo Video Creator** finalizes via **FREE_LOCAL** (`encodePhotoVideoLocal`). There is no separate server-side ffmpeg render job for this surface.

## Server authority (certified)

| Step | Implementation |
|---|---|
| Client sends trackId only | `PhotoVideoCatalogMusic.trackId` |
| Export fetches master | `GET /api/studio/free-music/asset/{trackId}?kind=master` |
| Spoofed audioUrl rejected | `resolveCatalogAudioForRender` + asset route |
| Registry → storage key | `admit-track.ts`, `resolve-asset.ts` |

## Motion Studio server render

Free Music is **not** wired into Motion/Instant Premium server render pipelines in Phase 3 (Quick Video scope only).

## Verdict

**SERVER_RENDER: N/A (Quick Video)**  
**SERVER_CATALOG_AUTHORITY: PASS**
