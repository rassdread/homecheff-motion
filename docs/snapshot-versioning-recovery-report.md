# Snapshots, Versioning & Recovery Report

**Date:** 2026-06-06  
**Scope:** Production configuration snapshots — no video renders, no collaboration.

---

## Samenvatting

Studio kan nu **herstelpunten** opslaan en handmatig herstellen via `buildStudioSnapshot()`. Versies zijn zichtbaar in **Versies** en **Productiegeschiedenis**, met vergelijking en Creation Assistant recovery hint.

---

## Hergebruikte systemen

| Systeem | Rol |
|---------|-----|
| Asset decision storage | Pattern + registry in snapshot |
| Production Timeline | `snapshot_created` / `snapshot_restored` events |
| Production Planner | Planner summary |
| Identity consumption | Asset completeness summaries |
| Creation Assistant | Recovery point display |
| AI Director enrichment chain | `snapshotContext` |
| Storyboard/scene PATCH APIs | Manual restore |

---

## Hoe snapshots werken

**Builder:** `src/lib/studio-snapshot-builder.ts` → `buildStudioSnapshot()`

**Storage:** `src/lib/studio-snapshot-storage.ts` — localStorage `hc-studio-snapshot-history-{storyboardId}`, max 20 snapshots

**Bevat:** storyboard config, scenes (config only), asset decisions, brief, identities, planner + assistant summaries

**Bevat niet:** renders, blobs, media

---

## Versioning & compare

- Snapshots listed newest-first with scene/duration/shot metadata
- `compareStudioSnapshots()` — human-readable diff lines (scenes, assets, duration, shots, render strategy)
- No code diff

---

## Recovery

- User confirms before restore (`window.confirm`)
- Restores storyboard fields + matching scenes via API
- Restores asset decisions to localStorage
- Records `snapshot_restored` timeline entry
- **No auto-restore**

---

## Timeline verbetering

New event kinds: `snapshot_created`, `snapshot_restored`  
Merged into Production History timeline via `buildSnapshotTimelineEvents()`

---

## Creation Assistant verbetering

Shows **Laatste veilige herstelpunt / Last safe recovery point** with link to Versions tab

---

## AI Director verbetering

`snapshotContext` on proposal — e.g. previous scene count from earlier recovery point

---

## Aangepaste bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/types/studio-production-snapshot.ts` | **Nieuw** |
| `src/lib/studio-snapshot-builder.ts` | **Nieuw** |
| `src/lib/studio-snapshot-storage.ts` | **Nieuw** |
| `src/lib/studio-snapshot-compare.ts` | **Nieuw** |
| `src/lib/studio-snapshot-recovery.ts` | **Nieuw** |
| `src/lib/studio-snapshot-context.ts` | **Nieuw** |
| `src/components/studio/studio-workspace-snapshots-section.tsx` | **Nieuw** UI |
| `src/types/studio-production-timeline.ts` | Snapshot event kinds |
| `src/types/studio-creation-assistant.ts` | `recoveryPoint` |
| `src/types/studio-director-proposal.ts` | `snapshotContext` |
| `src/lib/studio-production-timeline.ts` | Merge snapshot events |
| `src/lib/studio-creation-assistant.ts` | Recovery point |
| `src/lib/studio-director-proposal-builder.ts` | Snapshot enrichment |
| Production History / Versions / Creation Assistant panels | UI integration |
| `src/i18n/locales/en.ts` / `nl.ts` | Full parity |
| `src/lib/studio-snapshot-foundation.test.ts` | **Nieuw** — 11 tests |

---

## Bewust niet gebouwd

- Collaboration / team workflows
- Realtime editing / comments
- Video render snapshots (already in Motion Versions tab)
- Auto-restore
- Schema migrations / server-side snapshot store
- Scene create/delete on restore (only updates existing scene IDs)

---

## Volgende sprint

1. Auto-checkpoint before Director apply
2. Server-persisted snapshots for cross-device recovery
3. Scene add/remove on restore with diff preview
4. Named recovery points with user notes

---

## Validatie

Run: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`
