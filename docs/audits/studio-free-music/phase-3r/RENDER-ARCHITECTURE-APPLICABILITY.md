# Phase 3R — Render Architecture Applicability

**Date:** 2026-08-28  
**Product surface:** Quick Video / Photo Video Creator (`/studio/photo-video`)  
**Free Music integration:** catalog bed on Photo Video composition

---

## Architecture map

```
UI: px4a-export-download / px4a-item-finish
  → runLocalExport()
    → encodePhotoVideoLocal()   [src/lib/photo-video/export-local.ts]
      → WebCodecs + mediabunny in-browser encode
      → catalog master via GET /api/studio/free-music/asset/{trackId}?kind=master
      → File download (studio) OR client upload + handoff token (item journey)
```

### Server APIs under `/api/photo-video/`

| Route | Role |
|---|---|
| `export-upload` | Vercel Blob client token for handoff MP4 (after FREE_LOCAL encode) |
| `export-handoff` | Signed attach token → HomeCheff listing |
| `item-handoff` | Listing → Studio composer cookie |

**No** photo-video server ffmpeg / render-job / finalVideoUrl pipeline.

### Distinct product surfaces (out of scope for Free Music Quick Video)

- Instant Premium / Motion: server render + render versions + automatic finalization
- Editor fusion: separate server render services

Free Music catalog beds are wired into **Photo Video Composer** only (this Phase 3 scope).

---

## Code evidence

`photo-video-composer.tsx` export path:

```662:675:src/components/photo-video/photo-video-composer.tsx
      const { encodePhotoVideoLocal } = await import("@/lib/photo-video/export-local");
      // ...
      const encoded = await encodePhotoVideoLocal({
        composition: compositionRef.current,
        context: draftContext,
        audioBlob,
        // ...
      });
```

Catalog music in FREE_LOCAL:

```287:305:src/lib/photo-video/export-local.ts
  } else if (input.composition.audio.kind === "catalog") {
    // Server-authoritative path only — never accept client-supplied alternate audioUrl.
    const res = await fetch(`/api/studio/free-music/asset/${encodeURIComponent(trackId)}?kind=master`, {
      credentials: "include",
    });
```

---

## Verdicts

| Field | Value |
|---|---|
| QUICK_VIDEO_EXPORT_PATH | **FREE_LOCAL_ONLY** |
| FREE_MUSIC_CURRENT_SUPPORTED_EXPORT_PATH | **FREE_LOCAL_ONLY** |
| SERVER_RENDER_APPLICABILITY | **NOT_APPLICABLE** |
| SERVER_RENDER | **NOT_APPLICABLE** |
| AUTOMATIC_FINALIZATION_APPLICABILITY | **NOT_APPLICABLE** |
| AUTOMATIC_FINALIZATION | **NOT_APPLICABLE** |

### Why NOT_APPLICABLE does not block Phase 3 PASS

Adding or testing a Motion/Instant server-render route for Free Music would invent artificial scope. Authoritative certification for this product is FREE_LOCAL (already CERTIFIED on Chromium + Safari). Server catalog **authority** remains separately certified via asset API + spoof rejection.
