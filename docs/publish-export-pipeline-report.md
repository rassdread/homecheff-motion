# Publish Export Pipeline Report

**Commit:** Add Publish Export Pipeline

## Implemented

- `POST /api/publish/export` — ffmpeg locked-text overlay burn
- Maps overlays + subtitles → `LockedTextLayer[]`
- Download MP4 or graceful fallback message

## Key files

- `src/lib/publish-export.ts`
- `src/server/publish/publish-video-export-service.ts`
- `src/app/api/publish/export/route.ts`

## Limitation

Export requires ffmpeg in runtime environment; otherwise draft remains saved.
