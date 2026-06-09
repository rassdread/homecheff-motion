# Publish Phase 6 — Overlay Timeline V1

**Status:** Complete

## Summary

Standalone Publish product at `/publish` with video upload/select, overlay canvas, draggable text blocks, timeline start/end, properties panel, z-index, safe area guides, and local draft persist.

## Route

- `/publish` — Publish product entry (no longer redirects to `/videos`)
- `/videos` — legacy internal gallery remains
- `/presentation` → `/publish`

## Key files

- `src/types/publish-overlay.ts`
- `src/lib/publish-overlay-timeline.ts`
- `src/lib/publish-overlay-session.ts`
- `src/components/publish/publish-overlay-workspace.tsx`
- `src/components/publish/publish-product-page.tsx`
- `src/app/publish/page.tsx`

## Export limitation

Full ffmpeg export reuses existing pipeline when project-linked; V1 saves publish drafts locally (`hc-publish-projects-v1`).
