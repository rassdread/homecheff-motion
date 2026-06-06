# Identity Builder Audit Report

> Studio V2 — Identity Builder Foundation Audit (audit-only sprint)  
> Datum: 2025-06-07  
> Status: **Architectuur vastgesteld — geen code gewijzigd**

---

## Samenvatting

Studio bevat **voldoende fundament** voor één gedeelde Identity Spec Engine **zonder schema migratie in P0**. De identiteit van assets zit al in **Memory Snapshots** (`CharacterMemorySnapshot`, `LocationMemorySnapshot`, `PropMemorySnapshot`, `WorldMemorySnapshot`) en wordt actief gebruikt door scene image prompts, consistency en vision QA.

Wat ontbreekt is vooral:

1. Een **uniforme TypeScript-laag** (facade) boven de heterogene DB-veldnamen
2. **Identity Builder UI** — memory-velden zijn grotendeels API-only / read-only
3. **Upload → draft spec** — vision infrastructuur bestaat, maar extraction pipeline niet

De shift **Asset → Identity → Visuals → Voice → Continuity → Memory → Render** is architecturaal ondersteund; de zwakste schakel is **UX en naming**, niet ontbrekende database.

**Aanbeveling:** Bouw **één** `studio-identity-spec-engine` als mapper/facade. Bouw **geen** vier parallelle identity-systemen.

---

## Bestaande fundamenten

| Fundament | Bewijs in codebase |
|-----------|-------------------|
| Memory identity model | `src/types/studio-memory-snapshots.ts` |
| DB → memory mapping | `src/lib/studio-memory-mappers.ts` |
| Prompt consumption | `src/lib/studio-memory-prompt.ts`, `studio-scene-image-prompt.ts` |
| Consistency op memory | `src/lib/analyze-*-consistency.ts` |
| Post-gen vision QA | `src/server/studio/studio-vision-service.ts` |
| Voice sub-identity | `src/lib/studio-voice-identity-resolver.ts` |
| World linkage | `worldProfileId` op character/location/prop |
| Reference images | character/location/prop (required); world (none) |
| Strength enums | `identityStrength`, `continuityStrength` |
| Portable handoff snapshots | `src/types/studio-*-snapshot.ts` |
| Director asset matching | `studio-director-proposal-builder.ts` |
| Voice presets | `src/lib/studio-voice-profiles.ts` |

**Dekking generieke Identity Spec:** ~70% velden bestaan; rest is hernoemen/mapping in engine.

---

## Ontbrekende fundamenten

| Gap | Prioriteit |
|-----|------------|
| Unified Identity Spec type + mappers | P0 |
| Identity Builder UI (memory edit) | P0 |
| `colorTheme`, `forbiddenElements`, `usageContext` als first-class | P1 |
| Upload reference → draft spec (vision extraction) | P1 |
| World reference image | P2 |
| Persisted tags | P2 |
| Identity versioning / timeline UI | P2 |
| Shot planner ↔ asset identity | P2 |
| Visual/personality preset libraries (non-voice) | P1 |

---

## Aanbevolen architectuur

### Facade-first Identity Spec Engine

```
IdentitySpecEngine (TypeScript)
  ├── toIdentitySpec / fromIdentitySpec
  ├── toMemorySnapshot  → bestaande prompt/consistency pipeline
  ├── toSearchHaystack  → director + continuity
  └── identityCompleteness → future UI hints

Mappers per kind (geen aparte persistence):
  CharacterIdentityMapper  → StudioCharacter
  LocationIdentityMapper   → StudioLocation
  PropIdentityMapper       → StudioProp
  WorldIdentityMapper      → StudioWorldProfile

Extensions (bestaande subsysteem, geen duplicatie):
  CharacterIdentityVoice     → studio-voice-identity-*
  CharacterIdentityPerformance → studio-character-performance
```

**Kernprincipe:** Personage ≠ afbeelding. `referenceImageUrl` is één aspect van `references[]`; identiteit = memory + type + world + (character) voice.

### Upload-analyse (P1)

Haalbaar via bestaande OpenAI Vision stack + nieuwe extraction prompt → map naar memory velden → **gebruiker reviewt** vóór save. Geen image generation.

### Presets (P1)

Voice presets bewijzen patroon. Visual presets vullen Identity Spec defaults — geen parallelle preset engines.

### Uniekheid

Combinatie van rol, wereld, visuele regels, persoonlijkheid, reference + memory. UI disclaimer:

> *Ontworpen als eigen merkidentiteit. Juridische bescherming vereist aparte controle.*

---

## Implementatievolgorde

| Fase | Deliverables |
|------|--------------|
| **P0** | Types, mappers, tests; Character Identity Builder UI; engine als single source voor memory mapping |
| **P1** | Location/prop/world UI; analyze-reference; visual presets; completeness in visual production + project memory |
| **P2** | Shot planner advice; world moodboard; multi-ref; identity timeline; extended kinds (vehicle, brand mascot, …) |

Zie volledig plan: [`docs/studio-identity-builder-foundation-plan.md`](./studio-identity-builder-foundation-plan.md)

---

## Risico's

1. **Vier parallelle builders** — mitigatie: één engine, kind-extensions alleen in mappers
2. **Te vroege schema migratie** — mitigatie: facade over bestaande kolommen
3. **Memory UI blijft achter** — mitigatie: P0 character builder
4. **personality / personalityMemory drift** — mitigatie: central merge in engine
5. **Vision QA prompts hergebruiken voor upload** — mitigatie: aparte extraction service
6. **Props/world second-class** — mitigatie: pariteit in types vanaf P0

---

## Dubbele systemen vermijden

| Niet bouwen | Wel hergebruiken |
|-------------|------------------|
| CharacterIdentityService | `studio-character-service` + engine mapper |
| LocationIdentityService | `studio-location-service` + engine mapper |
| Nieuwe memory snapshot types | Bestaande `*MemorySnapshot` |
| Nieuwe consistency analyzer | Bestaande `analyze-*-consistency` |
| Nieuwe voice resolver | `studio-voice-identity-resolver` |
| Nieuwe vision provider | `studio-vision-providers` (P1 extraction only) |

---

## Documentatie

| Document | Inhoud |
|----------|--------|
| [`studio-identity-builder-reality-audit.md`](./studio-identity-builder-reality-audit.md) | Volledige reality audit, veldmapping, 10 vraagstukken, upload/preset/uniqueness |
| [`studio-identity-builder-foundation-plan.md`](./studio-identity-builder-foundation-plan.md) | Identity Spec Engine, per-kind mapping, P0/P1/P2, bewust niet bouwen |

---

## Tests/build status

**Geen code gewijzigd in deze sprint** — validatie niet uitgevoerd.

Bij implementatie-P0: `npm run lint` → `npm run typecheck` → `npm run build` → `npm run test` vóór commit (Riedel).

Huidige baseline (main @ asset evolution): 1588/1588 tests pass; typecheck heeft pre-existing orphans in `studio-voice-identity-sprint.test.ts` (niet gerelateerd aan identity builder).

---

## Conclusie

**Ja** — Studio kan een generieke Identity Builder architectuur krijgen die werkt voor personages, locaties, props en werelden, en later uitbreidbaar is naar voertuigen, dieren en merkpersonages via **type/category + tags**, niet via vier aparte engines.

Volgende sprint (indien goedgekeurd): **P0 Identity Spec Engine + Character Identity Builder UI** — nog steeds zonder schema migratie, providers, of image generation.
