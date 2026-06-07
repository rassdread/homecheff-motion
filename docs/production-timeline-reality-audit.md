# Production Timeline Reality Audit

**Date:** 2026-06-06  
**Scope:** Read-only audit before Production Timeline & History sprint.

---

## Geschiedenis die al bestaat

| Bron | Data |
|------|------|
| Storyboard / scenes | `createdAt`, `updatedAt` |
| Asset decisions (localStorage) | `decidedAt`, `fulfilledAt` |
| Library assets | `createdAt` |
| Project / Production Memory | Aggregate patterns (geen event log) |
| Motion side | Render versions, bundle audit, rerender audit |

---

## Beslissingen die verdwijnen

- Production Brief — niet opgeslagen na story create
- Director proposal — in-memory tot apply
- Creation Assistant snapshots — alleen derived view
- Asset registry — localStorage, geen server backup
- Geen unified production event store

---

## Overlap

- `project-timeline.ts` — Motion project renders (niet Studio brief)
- Asset lifecycle completed items ≈ timeline asset events
- Production memory patterns ≈ timeline memory events

---

## Wat zichtbaar moet worden

- Productie gestart, idee, stijl, doel
- Asset beslissingen + lifecycle (build → created → linked)
- Director structuur (afgeleid van scenes + prompt)
- Evolutie (scènes, personages, duur)
- Mijlpalen op projectniveau

---

## Central hook

`buildProductionTimeline()` — pure builder, zelfde input als Creation Assistant + asset registry.
