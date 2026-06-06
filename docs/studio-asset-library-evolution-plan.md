# Asset Library Evolution Plan

Aanbevelingen only — **geen migraties, geen nieuwe modellen, geen providers.**  
Vervolg op `studio-asset-lifecycle-reality-audit.md`.

---

## Principes

1. **IDs blijven leidend** — nooit naam-based linking introduceren.
2. **Suggestie-first** — usage, duplicates, delete impact als guidance, geen hard blocks (consistent met Consistency/Memory sprint).
3. **Hergebruik bestaande systemen** — Project Memory, Continuity tab, Director recurring detection uitbreiden i.p.v. nieuwe engines.
4. **Incrementeel** — elk punt kan los shippen.

---

## Fase 1 — Library visibility (P1, laag risico)

**Doel:** Gebruiker begrijpt wat gebruikt wordt en wat veilig verwijderd kan.

| Aanbeveling | Hergebruik | Geen migratie |
|-------------|------------|----------------|
| Toon `storyboardCount` / `sceneCount` op standalone library cards | Extend list responses with optional `?include=usage` calling existing `buildStudioProjectMemory` aggregation | Query-only |
| “In gebruik” badge op assets met `storyboardCount >= 1` | Memory stats | — |
| Delete confirm toont: “Gebruikt in N videoverhalen” | `getAssetUsageStats` | — |
| Link “Bekijk in Continuïteit” vanuit library | Bestaande continuity tab | — |

**Niet bouwen:** apart usage dashboard, export tooling.

---

## Fase 2 — Duplicate guidance (P1, medium)

**Doel:** Verminder “Chef Marco / Chef Marco Copy / V2” zonder merge automation.

| Aanbeveling | Implementatie hint |
|-------------|-------------------|
| Bij create: fuzzy name check → “Bestaat al: Chef Marco — open bestaande?” | `namesMatch` uit recurring detection |
| Bij Director proposed-new: altijd recurring card vóór handmatig create | Already partial — extend to props |
| Library filter: “Mogelijke duplicaten” (zelfde normalized name) | Client-side group op `normalizeName` |
| **Geen** auto-merge | User kiest expliciet |

**Niet bouwen:** ML dedup, forced canonical names, slug rewrite tools.

---

## Fase 3 — Scale ergonomics (P2)

**Doel:** 1000+ assets per type blijven bruikbaar.

| Aanbeveling | Wanneer |
|-------------|---------|
| Server-side search + pagination op list APIs | Wanneer p95 library load > 2s |
| Virtualized grid in library UI | Same trigger |
| Workspace: lazy-load libraries (alleen active tool tab) | Reduce initial workspace payload |
| Memory API: cache per owner (short TTL) | Reduce repeated aggregation |

**Niet bouwen:** Elasticsearch, external asset CDN catalog.

---

## Fase 4 — Lifecycle hygiene (P2)

**Doel:** Orphan blobs en stale handoff verminderen.

| Aanbeveling | Scope |
|-------------|-------|
| Blob delete hook on scene/storyboard cascade delete | Extend `deleteStudioSceneImage` pattern |
| Character delete: cleanup mouth + preview blobs | Extend `deleteStudioCharacter` |
| Optional admin “storage audit” script (read-only report first) | Script only, geen cron verplicht |
| Handoff staleness already exists — surface in workspace banner | `studioIntelligenceStatus` |

**Niet bouwen:** Automatic nightly sweeper zonder metrics; global blob dedup by hash.

---

## Fase 5 — Continuity integration (P2, alignment)

**Doel:** Asset changes reflecteren in Director/Memory/Consistency.

| Aanbeveling | Bestaand |
|-------------|----------|
| Na asset rename: memory keyed on ID (already) — toon display name live | ✓ IDs stable |
| Props in `findRecurringMatchesForIdea` | Gap fill |
| Consistency fix actions: “duplicate name detected” soft warning | Extend fix suggestions |
| Director preview: toon library asset ID disambiguation when names collide | UX copy only |

**Niet bouwen:** Event bus, asset change webhooks, versioned asset snapshots.

---

## Fase 6 — Reference & scene image policy (P3)

| Aanbeveling | Notities |
|-------------|----------|
| Generation limit warning per scene (soft) | “12 versies — overweeg opruimen” |
| Bulk “ verwijder niet-geselecteerde generations” | User-initiated |
| Reference image: validate `primaryReferenceImageId` against known upload IDs | String validation only |

**Niet bouwen:** ReferenceImages table, gallery CDN.

---

## Prioriteit matrix

| P | Item | Impact | Effort |
|---|------|--------|--------|
| P1 | Usage counts on library + delete warning | Hoog | Laag |
| P1 | Create-time duplicate hint | Hoog | Laag |
| P1 | Props recurring detection | Medium | Laag |
| P2 | Pagination + server search | Hoog (at scale) | Medium |
| P2 | Cascade blob cleanup | Medium | Medium |
| P2 | Workspace lazy library load | Medium | Medium |
| P3 | Scene image generation housekeeping | Medium | Medium |

---

## Wat expliciet niet in dit plan hoort

- Schema migraties / nieuwe Prisma models
- Voice cloning, STT, MP4 upload
- Global asset graph / registry product
- Automatic asset merging or deletion
- Breaking changes to slug or ID strategy
- New AI providers for dedup

---

*Plan aligned with Studio V2 suggest-first philosophy and recent Memory/Consistency sprints.*
