# Project Persistence Certification

**Status:** PASS

## Policy

- Authoritative identity: `catalogTrackId` (`audio.trackId` in composition)
- Draft meta stores: trackId, startSeconds, durationSeconds, trackDurationSeconds, volume, title, artist snapshot
- Does **not** persist signed URLs or blob handles for catalog masters
- On restore: re-resolve bytes from API at preview/export time

## Implementation

- `src/lib/photo-video/draft-storage.ts` — `toDraftCompositionMeta` / `restorePhotoVideoDraft`
- IndexedDB: no catalog audio blob stored (by design)

## Suspension behavior

Stale project with suspended track: export fetch fails closed (`catalog-music` error); user must replace/remove (UI error path).

## Verdict

**PROJECT_PERSISTENCE: PASS**
