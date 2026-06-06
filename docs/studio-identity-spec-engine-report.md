# Identity Spec Engine Report

> Studio V2 — Identity Spec Engine Foundation sprint  
> Gebaseerd op [reality audit](./studio-identity-builder-reality-audit.md), [foundation plan](./studio-identity-builder-foundation-plan.md), [audit report](./studio-identity-builder-audit-report.md).

---

## Welke audit-bevindingen zijn gebruikt

- **Facade-first** — geen Prisma migratie; mappers op bestaande kolommen
- **Memory Snapshots** als de facto identity model → `toMemorySnapshot` / `fromMemorySnapshot`
- **personality vs personalityMemory** — `mergePersonality()` centraliseert merge-regel
- **Heterogene veldnamen** per kind → `visualRules`, `usageContext`, `forbiddenElements` als unified views
- **Voice** blijft apart subsysteem → `IdentityVoiceReference` op character specs only
- **Director + recurring haystack** — gecentraliseerd via `toSearchHaystack()`
- **Shot planner compat** — `collectSceneIdentitySpecs()` (read-only, geen nieuwe shot-logica)

---

## Welke bestaande systemen zijn hergebruikt

| Systeem | Hergebruik |
|---------|------------|
| `studio-memory-mappers.ts` | `toCharacterMemorySnapshot` etc. via row converters |
| `studio-memory-snapshots.ts` | Target types voor memory integration |
| `studio-api.ts` entity types | Input voor `toIdentitySpec` |
| `studio-director-proposal-builder.ts` | `scoreAssetMatch` + haystack via engine |
| `studio-recurring-asset-detection.ts` | Token scoring via `toSearchHaystack` |
| `studio-character-validation.ts` | Patch types in `fromIdentitySpec` |
| `studio-media-asset-registry.ts` | Tag-logica gespiegeld in mappers (niet gewijzigd) |

---

## Hoe IdentitySpecBase werkt

**Bestand:** `src/types/studio-identity-spec.ts`

Gedeelde velden op alle kinds:

- `id`, `name`, `type` (role/category), `role` (character alias)
- `description`, `personality`, `visualKeywords`, `visualRules`
- `tags`, `references[]`, `world` link
- `usageContext`, `forbiddenElements`
- `continuityMetadata`, `memoryMetadata` (kind-specific union)

Discriminated union: `IdentitySpec` = character | location | prop | world.

Character extension: `voice?: IdentityVoiceReference`, `isMascot`.

Geen database kolommen — pure TypeScript facade.

---

## Hoe adapters werken

**Bestand:** `src/lib/studio-identity-spec-mappers.ts`

| Adapter | Richting |
|---------|----------|
| `characterToIdentitySpec` | `StudioCharacterListItem` → spec |
| `locationToIdentitySpec` | `StudioLocationListItem` → spec |
| `propToIdentitySpec` | `StudioPropListItem` → spec |
| `worldToIdentitySpec` | `StudioWorldProfileListItem` → spec |
| `characterFromIdentitySpec` | spec → `CharacterIdentitySpecPatch` |
| `locationFromIdentitySpec` | spec → `LocationIdentitySpecPatch` |
| `propFromIdentitySpec` | spec → `PropIdentitySpecPatch` |
| `worldFromIdentitySpec` | spec → `WorldIdentitySpecPatch` |

**Public API:** `src/lib/studio-identity-spec-engine.ts`

- `toIdentitySpec(entity)` — overloaded per entity type
- `fromIdentitySpec(spec)` — `{ kind, patch }` voor bestaande validation/API

---

## Hoe memory mapping werkt

```
Entity → toIdentitySpec → identitySpecTo*Row → studio-memory-mappers → *MemorySnapshot
*MemorySnapshot → *MemorySnapshotToIdentitySpec → IdentitySpec
```

- `toMemorySnapshot(spec)` — delegeert naar bestaande `toCharacterMemorySnapshot` etc.
- `fromMemorySnapshot(snapshot)` — reverse via dedicated snapshot→spec mappers
- **Geen wijzigingen** aan `studio-memory-mappers.ts` internals

Round-trip getest: entity memory ≡ `toMemorySnapshot(toIdentitySpec(entity))`.

---

## Hoe voice identity aansluit

- Character specs bevatten `IdentityVoiceReference` (read-only view van DB voice velden)
- **Geen wijzigingen** aan voice clone, voice identity resolver, voice profiles
- `toSearchHaystack` voegt `voice.profile` toe aan extraFields voor matching
- Voice blijft **niet** in `fromIdentitySpec` patch (memory/identity only)

---

## Hoe continuity aansluit

- `studio-recurring-asset-detection.ts` gebruikt `toSearchHaystack(toIdentitySpec(entity))` voor token matching
- Recurring reason keys ongewijzigd; rijkere haystack (appearance, visual rules, etc.)
- Asset evolution / continuity panels **niet gewijzigd** — klaar voor P1 completeness

---

## Hoe project memory aansluit

- Project memory blijft **id-based** usage stats
- Engine exporteert `identityCompleteness(spec)` (0–100, intern) voor toekomstige P1 stats
- Geen wijzigingen aan `studio-project-memory-service.ts`

---

## Hoe visual production aansluit

- `toMemorySnapshot` output compatible met scene image planner / consistency input
- `collectSceneIdentitySpecs` extraheert specs per scene voor future gap hints
- **Geen wijzigingen** aan prompt builders of scene image generation

---

## Hoe shot planner aansluit

- `collectSceneIdentitySpecs({ scene, characters, locations, props, worlds })` → `SceneIdentitySpecBundle`
- Read-only; geen nieuwe shot beats of blocking
- P2: shot → required identity advies kan deze bundle consumeren

---

## Welke bestanden zijn toegevoegd

| Bestand | Rol |
|---------|-----|
| `src/types/studio-identity-spec.ts` | Types |
| `src/lib/studio-identity-spec-mappers.ts` | Per-kind mappers |
| `src/lib/studio-identity-spec-engine.ts` | Public API |
| `src/lib/studio-identity-spec-engine.test.ts` | 9 unit tests |
| `docs/studio-identity-spec-engine-report.md` | Dit document |

---

## Welke bestanden zijn gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/studio-director-proposal-builder.ts` | Matching haystack via engine |
| `src/lib/studio-recurring-asset-detection.ts` | Recurring haystack via engine |
| `package.json` | Test script entry |

---

## Wat bewust niet gebouwd is

- Character / Location / Prop / World Identity **Builder UI**
- Upload → draft spec (vision extraction)
- Preset libraries
- Schema migratie
- Nieuwe providers / AI systemen
- Image generation wijzigingen
- i18n UI strings (geen zichtbare UI)
- Parallelle `CharacterIdentityEngine` services

---

## Wat de volgende sprint moet zijn

**P0 uit audit plan — Character Identity Builder UI:**

1. Edit memory velden (appearance, keywords, clothing, continuity)
2. Voice tab (bestaande voice panel hergebruiken)
3. `fromIdentitySpec` → PATCH API op save (gebruiker bevestigt)

Daarna P1: location/prop/world builders, upload analyze-reference, visual production completeness hints.

---

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | Pass |
| `npx prisma generate` | Pass |
| `npm run lint` | Pass (0 errors) |
| `npm run typecheck` | Pre-existing orphans in unrelated test files; **geen errors in identity spec files** |
| `npm run build` | Pass |
| `npm run test` | **1597/1597 pass** (9 identity spec engine tests) |

---

## Architectuurdiagram

```
                    ┌─────────────────────────┐
                    │  studio-identity-spec   │
                    │  -engine.ts (public)    │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     toIdentitySpec      toMemorySnapshot    toSearchHaystack
              │                 │                 │
              ▼                 ▼                 ▼
     studio-*-mappers    studio-memory-     director / recurring
              │          mappers (bestaand)   asset detection
              ▼
     StudioCharacter / Location / Prop / WorldProfile (DB/API)
```
