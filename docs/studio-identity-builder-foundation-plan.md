# Identity Builder Foundation Plan

> Architectuurplan op basis van [Identity Builder Reality Audit](./studio-identity-builder-reality-audit.md). **Geen implementatie in deze sprint.**

---

## Identity Spec Engine

### Doel

Eén **read/write facade** in TypeScript die vier asset-kinds uniform behandelt zonder nieuwe AI-provider, schema migratie, of image generation.

### Kern-type (conceptueel)

```typescript
type IdentitySpecKind = "character" | "location" | "prop" | "world";

type IdentitySpecBase = {
  kind: IdentitySpecKind;
  id?: string;
  name: string;
  type: string;              // role | category | ""
  description: string;
  personality?: string;      // character + world tone mapping
  visualRules: string;        // merged from kind-specific fields
  colorTheme?: string;        // P1: extract from keywords or dedicated field
  references: IdentityReference[];
  worldId?: string | null;
  worldName?: string | null;
  usageContext?: string;      // P1: mapped from continuityNotes
  forbiddenElements?: string; // P1: mapped from continuityRules / brandingRules
  tags: string[];
  continuityStrength: StudioContinuityStrength;
  continuityMetadata: {
    notes: string;
    identityStrength?: StudioContinuityStrength; // character only
  };
};

type IdentityReference = {
  url: string;
  storageKey?: string;
  role: "primary" | "mouth_closed" | "mouth_open" | "secondary"; // character mouth P2
  notes?: string;
};
```

### Engine API (P0 — lib only)

| Functie | Doel |
|---------|------|
| `toIdentitySpec(entity, kind)` | DB row / API detail → unified spec |
| `fromIdentitySpec(spec)` | Draft → PATCH body per kind (bestaande validation) |
| `toMemorySnapshot(spec)` | → bestaande `*MemorySnapshot` types |
| `toPortableSnapshot(spec)` | → Character/Location/Prop Snapshot (handoff) |
| `identityCompleteness(spec)` | 0–100% op basis of memory velden gevuld (geen score in UI P0) |
| `toSearchHaystack(spec)` | Voor director matching + recurring detection |
| `mergePersonality(spec)` | Centraliseert personality / personalityMemory regel |

### Persistence-strategie

- **P0:** Geen Prisma-wijziging — engine mapt 1:1 op bestaande kolommen
- **P1:** Optioneel `identityDraftJson` op asset (alleen als UI draft/autosave nodig)
- **P2:** Overweeg unified `tags` column alleen na bewezen behoefte

### Locatie in codebase (toekomst)

```
src/types/studio-identity-spec.ts
src/lib/studio-identity-spec-engine.ts
src/lib/studio-identity-spec-mappers.ts   // per-kind field mapping
src/lib/studio-identity-spec-engine.test.ts
```

---

## Character Identity

### Bestaande basis

Rijkste entiteit: memory (9 velden) + voice (10+ velden) + performance + mouth animation.

### Mapping Identity Spec → DB

| Identity Spec | StudioCharacter veld |
|---------------|---------------------|
| `type` | `role` |
| `personality` | `personality` (+ sync naar `personalityMemory` via engine) |
| `visualRules` | concat/normalize: `appearanceMemory`, `visualKeywords`, clothing, accessories |
| `references[primary]` | `referenceImageUrl`, `referenceStorageKey`, `referenceNotes` |
| `worldId` | `worldProfileId` |
| `continuityMetadata.notes` | `continuityNotes` |
| `continuityMetadata.identityStrength` | `identityStrength` |
| `continuityStrength` | `continuityStrength` |

### CharacterIdentityVoice (extension, geen aparte engine)

Bestaand subsysteem blijft:

- `ResolvedCharacterVoiceIdentity` uit `studio-voice-identity-resolver.ts`
- UI: character form voice panel + storyboard voice identity panel
- Identity Builder toont voice als **tab**, niet als duplicate data model

### CharacterIdentityPerformance (extension)

- Bestaande `studio-character-performance.ts` velden
- Alleen character; niet generiek maken in P0

---

## Location Identity

### Mapping

| Identity Spec | StudioLocation veld |
|---------------|---------------------|
| `type` | `category` |
| `visualRules` | `visualIdentity` + `environmentKeywords` + `worldMemory` |
| `references[primary]` | `referenceImageUrl`, `referenceStorageKey` |
| Overige | zelfde pattern als character (world, continuity) |

### Preset-ready dimensies (P1)

Category enum dekt “type”; presets kunnen defaults vullen voor `environmentKeywords` (sfeer, verlichting).

---

## Prop Identity

### Mapping

| Identity Spec | StudioProp veld |
|---------------|-----------------|
| `type` | `category` |
| `visualRules` | `appearanceMemory` + `brandingRules` |
| `forbiddenElements` (P1) | `brandingRules` (merkstijl / don'ts) |

### Gap

Geen `visualKeywords` — engine kan `tags` afleiden uit category + appearanceMemory tokens.

---

## World Identity

### Mapping

| Identity Spec | StudioWorldProfile veld |
|---------------|-------------------------|
| `visualRules` | `visualStyle` + `continuityRules` |
| `personality` | `tone` |
| `description` | `description` |
| `references` | **leeg P0** — P2 optionele moodboard ref |

### Relatie tot child assets

World identity **cascadeert context** via `worldProfileId` op character/location/prop — engine resolveert `world` in `SceneMemoryBundle` zoals vandaag.

---

## Wat P0 is

1. **Types + mappers** — `IdentitySpecBase` + per-kind mapping naar/from bestaande DB/API shapes
2. **Engine helpers** — `toMemorySnapshot`, `toSearchHaystack`, `mergePersonality`, `identityCompleteness`
3. **Unit tests** — round-trip DB row → spec → PATCH body; geen UI verplicht in P0 als audit verlengd wordt
4. **Identity Builder UI (character first)** — edit memory velden die vandaag read-only/API-only zijn
5. **Documentatie** — preset taxonomy, disclaimer copy, consumer migration guide
6. **Consumer refactor (minimaal)** — director `scoreAssetMatch` haystack via `toSearchHaystack` (optioneel, 1 PR)

**P0 expliciet niet:** schema migratie, vision upload analyse, nieuwe presets library, shot planner koppeling.

---

## Wat P1 is

1. **Identity Builder UI** — location, prop, world (world heeft geen ref image edit)
2. **Upload → draft spec** — `POST analyze-reference-image` met extraction prompt (OpenAI Vision hergebruik)
3. **Review flow** — gebruiker bevestigt draft vóór PATCH (geen auto-save naar library)
4. **Visual production** — “beeld ontbreekt omdat identity incompleet is” via `identityCompleteness`
5. **Project memory** — optional `identityCompleteness` + lastUpdated in snapshot
6. **Preset library (visual)** — character personality/outfit, location mood, prop function templates
7. **`colorTheme` / `forbiddenElements`** — dedicated UI secties die mappen op keywords/continuityRules
8. **Asset evolution** — “identity ontbreekt” naast “asset ontbreekt”

---

## Wat P2 is

1. **Shot planner** — shot beat → required asset identity check (advies-only)
2. **World reference moodboard** — optional image(s) voor world profile
3. **Multi-reference gallery** — `primaryReferenceImageId` + secondary refs model
4. **Identity versioning / timeline** — koppeling met character consistency timeline (`CharacterIdentityTimeline`)
5. **Uitbreiding kinds** — voertuigen (`category: vehicle` bestaat), dieren (`role: animal`), merkpersonages, organisaties, productlijnen via category/role + tags
6. **Persisted tags** column
7. **Create sheet prefill** — vanuit director `ProposedNewAsset` + identity draft
8. **Motion handoff v2** — portable snapshot includes memory subset from Identity Spec

---

## Wat bewust niet gebouwd moet worden

| Item | Reden |
|------|-------|
| Nieuwe AI provider | Constraint |
| Image generation / asset generators | Constraint |
| Automatische asset-creatie uit identity | Gebruiker blijft eigenaar |
| Automatische asset-koppeling | Zelfde |
| Schema migratie (P0) | Bestaande kolommen voldoende |
| Aparte CharacterIdentity / LocationIdentity **services** | Duplicatie |
| `CharacterIdentityEngine`, `LocationIdentityEngine`, … | Eén engine + mappers |
| Juridische uniqueness validator | Disclaimer only |
| Identity score in UI (P0) | Consistency/readiness bestaat al |
| LoRA / training pipelines | docs/studio-character-engine-future.md non-goals |
| Hergebruik Studio Vision QA prompts voor upload | Verkeerde semantiek |

---

## Implementatievolgorde (na audit)

```
P0  Types + mappers + tests
    ↓
P0  Character Identity Builder UI (memory fields)
    ↓
P0  Engine wired in memory-mappers (single source)
    ↓
P1  Location / Prop / World builder UI
    ↓
P1  analyze-reference-image (optional draft)
    ↓
P1  Visual production + project memory completeness
    ↓
P2  Shot planner + world moodboard + versioning
```

---

## Integratie met bestaande Studio V2-lagen

| Laag | Integratie |
|------|------------|
| Asset Evolution | P1: completeness + missing identity advies |
| AI Director | Haystack via engine; proposal blijft bestaande builder |
| Project Memory | P1: completeness stat |
| Continuity | `toSearchHaystack` voor recurring |
| Consistency | Geen wijziging — input blijft memory snapshots |
| Visual Production | P1: identity gap reasons |
| Shot Planner | P2: required identity advies |
| Voice Identity | Character tab; geen merge in base spec |
| Scene Image Planner | `toMemorySnapshot` single path |

---

## i18n (voor latere UI)

NL/EN parity onder `studio.identityBuilder.*` — apart van `studio.assetEvolution.*`:

- Identiteitsspecificatie / Identity spec
- Visuele regels / Visual rules
- Persoonlijkheid / Personality
- Referentiebeeld / Reference image
- Hergebruik aanbevolen / Reuse recommended (consistent met asset evolution)
- Ontworpen als eigen merkidentiteit… / Designed as your own brand identity…
