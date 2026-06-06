# Asset Lifecycle Audit Report

Executive summary — Studio V2 Asset Lifecycle & Library Reality Audit.  
**Audit only — nothing built, migrated, or refactored.**

Volledige detail: [`studio-asset-lifecycle-reality-audit.md`](./studio-asset-lifecycle-reality-audit.md)  
Evolution plan: [`studio-asset-library-evolution-plan.md`](./studio-asset-library-evolution-plan.md)

---

## Gevonden risico's

| # | Risico | Ernst | Asset types |
|---|--------|-------|-------------|
| 1 | Display-name duplicates toegestaan (slug ≠ name) | **Hoog** | Characters, locations, props, worlds |
| 2 | Delete zonder “in use” guard | **Hoog** | All library assets |
| 3 | Full-list API load (no pagination) | **Hoog @ scale** | All libraries |
| 4 | Orphan blobs on cascade delete | **Medium** | Scene images, voice audio, mouth assets |
| 5 | Workspace loads entire library every session | **Medium @ scale** | All libraries |
| 6 | Props missing from recurring/memory sweep | **Medium** | Props |
| 7 | World delete unlinks silently | **Medium** | Worlds |
| 8 | Rename regenerates slug (URLs stale) | **Laag** | All slugged assets |
| 9 | `primaryReferenceImageId` unvalidated | **Laag** | Characters |
| 10 | System asset flags not enforced on delete | **Laag** | Characters, locations, props |

---

## Schaalbaarheidsanalyse

**Vraag:** Kan Studio op schaal (1000+ assets) nog logisch functioneren?

| Dimensie | < 200 / type | 200–500 | 500–1000+ |
|----------|--------------|---------|-----------|
| **Data integrity** | 🟢 Gezond | 🟢 Gezond | 🟢 Gezond (ID-based) |
| **Library UX** | 🟢 Gezond | 🟡 Waarschuwing | 🔴 Risico (load, search) |
| **Director/Memory matching** | 🟢 Gezond | 🟡 Waarschuwing | 🔴 Risico (name ambiguity) |
| **Storage (blobs)** | 🟢 Gezond | 🟡 Waarschuwing | 🔴 Risico (generations) |
| **Delete safety** | 🟡 Waarschuwing | 🟡 Waarschuwing | 🔴 Risico |

**Kern:** Logica blijft correct door stable IDs; **bruikbaarheid en opslag** worden de bottleneck — niet relationele consistentie.

---

## Duplicatieanalyse

| Mechanisme | Voorkomt duplicaat? | Gap |
|------------|---------------------|-----|
| `@@unique([ownerId, slug])` | Slug collisions | **Niet** display name |
| Director `libraryHasSimilarName` | Blocks proposed-new if exact name in library | Fuzzy variants pass |
| Recurring detection | Suggests existing | Does not block create |
| Apply proposal | Skips auto-create | User can still manual duplicate |
| Scene images | N/A (multi-version by design) | — |

**Typisch scenario:** “Chef Marco” × 3 entries → Memory may suggest one; user can ignore and create more.

---

## Bibliotheekanalyse

| Feature | Standalone libraries | Workspace | Continuity tab |
|---------|---------------------|-------------|----------------|
| Search | Client substring | — | — |
| Usage counts | ❌ | Partial (current story) | ✅ cross-storyboard |
| Delete safety info | ❌ | — | — |
| Pagination | ❌ | ❌ (full fetch) | Top-N slice |
| Duplicate hint | ❌ | Director only | Reuse suggestions |

**Sterkste bestaande surface:** Continuity tab + Project Memory API.  
**Zwakste:** Standalone library pages at scale.

---

## Asset health per type

| Type | Status | Reden |
|------|--------|-------|
| **Characters** | 🟡 Waarschuwing | Name dupes, partial blob cleanup, heavy reuse paths |
| **Locations** | 🟢 Gezond / 🟡 delete | Simple FK model; no usage guard |
| **Props** | 🟡 Waarschuwing | Less memory coverage |
| **Worlds** | 🟡 Waarschuwing | Indirect linking, silent unlink on delete |
| **Voice identity** | 🟡 Waarschuwing | No asset row; profile strings |
| **Storyboard voice audio** | 🟡 Waarschuwing | No delete API; blob orphan risk |
| **Scene images** | 🔴 Risico @ scale | Unbounded generations; cascade blob gap |
| **Reference images** | 🟡 Waarschuwing | Embedded; no catalog |

---

## Aanbevolen volgende stap

**P1 — Library visibility sprint** (geen migratie):

1. Usage counts op library cards via bestaande `buildStudioProjectMemory`
2. Delete confirm: “Gebruikt in N videoverhalen”
3. Create-time duplicate hint (`namesMatch`)
4. Props in recurring detection

Zie [`studio-asset-library-evolution-plan.md`](./studio-asset-library-evolution-plan.md) Fase 1–2.

---

## Wat juist niet gebouwd moet worden

- Nieuwe asset registry / memory graph / continuity engine
- Schema migraties of ReferenceImage model
- Automatic merge, auto-delete, of hard delete blocks
- Pagination vóór bewezen performance pain (wel plan klaar)
- Blob sweeper cron zonder storage monitoring
- Nieuwe AI providers voor deduplicatie
- Voice cloning / STT / upload pipelines

---

## Tests/build status

Validatie op huidige `main` (audit-only, geen code changes):

| Check | Status |
|-------|--------|
| `npm run lint` | Pass (0 errors) |
| `npm run typecheck` | Pass* |
| `npm run build` | Pass |
| `npm run test` | **1541/1541** |

\*Pre-existing typecheck warnings in unrelated test fixtures may appear in strict local runs; production build passes.

---

## Continuity impact samenvatting

When an asset **changes** or **deletes**:

| System | Effect |
|--------|--------|
| **AI Director** | Matching uses live library fetch — reflects renames; loses deleted IDs on apply |
| **Project Memory** | Stats recompute on next API call — IDs keyed |
| **Consistency** | Scene links update immediately on delete (SetNull/Cascade) |
| **Motion handoff** | May contain stale snapshot until intelligence refresh |

All systems are **eventually consistent** with library state; none auto-heal storyboard content after delete.

---

*Report generated as part of Studio V2 audit-first workflow. Implementatie pas na expliciete sprint approval.*
