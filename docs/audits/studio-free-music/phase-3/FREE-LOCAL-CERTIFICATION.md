# FREE_LOCAL Certification

**Status:** PARTIAL — code path certified; device matrix NOT_RUN

## Chain (Quick Video)

```
Studio → Free Music select → fragment/volume → encodePhotoVideoLocal
  → fetch /api/studio/free-music/asset/{id}?kind=master (credentials)
  → mix with optional source video audio → MP4 + watermark
```

## Verified

- `export-local.ts` catalog branch uses server API only (no client URL trust)
- `ownMusicExportWindow` shared for catalog (no loop)
- Unit tests: export window, draft persistence

## Device matrix

| Device | Status |
|---|---|
| Chromium desktop | NOT_RUN |
| Safari desktop | NOT_RUN |
| iPhone Safari | NOT_RUN |

Prior Quick Video FREE_LOCAL certification (Slice 1B / PX.4A.7) remains valid for **own music**; catalog-specific re-cert pending.

## Verdict

**FREE_LOCAL: PARTIAL**
