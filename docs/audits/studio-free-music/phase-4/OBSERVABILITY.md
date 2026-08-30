# Phase 4 — Observability

## Implementation

Local structured events via `src/lib/free-music/analytics.ts` (same privacy model as photo-video funnel).

Storage key: `hc-free-music-analytics-v1` (browser localStorage, capped).

## Events

| Event | When |
|---|---|
| `free_music_catalog_opened` | Free Music browser mounts |
| `free_music_catalog_loaded` | Catalog fetch OK (`trackCount`) |
| `free_music_catalog_failed` | Catalog fetch error |
| `free_music_preview_started` | Preview play attempted |
| `free_music_preview_failed` | Preview play failed |
| `free_music_track_selected` | Track selected |
| `free_music_track_replaced` | Selection changed to another track |
| `free_music_track_removed` | Catalog cleared when switching to My music |
| `free_music_export_started` | FREE_LOCAL export with catalog music |
| `free_music_export_completed` | Export OK |
| `free_music_export_failed` | Export fail |
| `free_music_content_id_reported` | Reserved for report UI / ops |

## Reporting

`summarizeFreeMusicEvents()` derives counts, preview/export failure rates, top selected tracks.

No new admin dashboard in Phase 4 — queries/summaries from local storage + Production logs are sufficient.

## Incident thresholds

| Severity | Trigger | Action |
|---|---|---|
| P0 | Security leak (anon asset access), widespread broken FREE_LOCAL export, corrupted projects | Kill switch OFF; investigate |
| P1 | Material catalog/preview/export failure affecting many users | Kill switch if needed; otherwise track-level disable |
| P2 | Isolated track / metadata / Content ID report | REVIEW → TEMPORARILY_DISABLE per runbook |
| P3 | Cosmetic / analytics gap | Fix in normal cadence |

## Immediate post-launch health

Capture after final public ON: catalog requests, preview attempts/errors, selections, exports/errors (if any), auth failures, server errors, Content ID reports, billing/provider anomalies. Do not invent rates from insufficient traffic.
