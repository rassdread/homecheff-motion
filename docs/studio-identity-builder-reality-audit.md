# Identity Builder Reality Audit

> Audit-only sprint — geen implementatie. Doel: bepalen of één gedeelde **Identity Spec Engine** haalbaar is voor personages, locaties, props en werelden.

---

## Welke systemen al bestaan

| Systeem | Bestand(en) | Rol t.o.v. identity |
|---------|-------------|---------------------|
| **Character library** | `studio-character-service.ts`, `studio-character-form.tsx` | CRUD + reference image + voice + performance |
| **Location library** | `studio-location-service.ts`, `studio-location-form.tsx` | CRUD + category + reference image |
| **Prop library** | `studio-prop-service.ts`, `studio-prop-form.tsx` | CRUD + category + reference image |
| **World profiles** | `studio-world-profile-service.ts`, `studio-world-profile-form.tsx` | CRUD — geen reference image |
| **Memory snapshots** | `types/studio-memory-snapshots.ts`, `lib/studio-memory-mappers.ts` | **De facto identity model** voor prompts & analyse |
| **Portable snapshots** | `studio-*-snapshot.ts` (character/location/prop) | Minimale handoff-identiteit (6 velden) |
| **Memory prompts** | `studio-memory-prompt.ts`, `studio-prompt-*-builder.ts` | Identity → scene image prompt |
| **Character identity prompt** | `studio-character-identity-prompt.ts` | Drift-correctie na consistency |
| **Consistency engine** | `analyze-*-consistency.ts`, `build-scene-consistency-report.ts` | Vergelijkt memory vs gegenereerd beeld |
| **Vision QA (V13)** | `studio-vision-service.ts`, `studio-vision-providers/` | Post-generatie identity check vs memory + refs |
| **Voice identity** | `studio-voice-identity-*.ts` | Character-only voice resolution & lock |
| **Project memory** | `studio-project-memory-service.ts` | Usage stats per asset id (geen identity text) |
| **Continuity** | `studio-project-continuity-score.ts`, `studio-recurring-asset-detection.ts` | Recurring match op name/description/personality/category |
| **Director proposal** | `studio-director-proposal-builder.ts` | Asset matching op identity-achtige velden |
| **Asset evolution** | `studio-asset-evolution.ts` | Present/recommended/missing — ids + names |
| **Scene image planner** | `studio-scene-image-planner.ts`, `studio-scene-image-prompt.ts` | Volledige memory bundle → prompt + refs |
| **Asset create sheet** | `studio-workspace-asset-create-sheet.tsx` | Minimale create (name, description, ref, worldProfileId) |
| **Asset library / registry** | `studio-media-asset-registry.ts` | Derived tags uit role/category/keywords |
| **Performance profile** | `studio-character-performance.ts` | Character-only facial/mouth animation identity |

**Prisma-modellen:** `StudioCharacter`, `StudioLocation`, `StudioProp`, `StudioWorldProfile` in `prisma/schema.prisma`.

**Belangrijk:** Er is geen type, API of UI genaamd “Identity Spec”. Het dichtstbijzijnde is het **Memory Snapshot**-model plus character **voice/performance**-velden.

---

## Welke identity-data al bestaat

### Per entiteit — databasevelden

#### StudioCharacter

| Identity-concept | Bestaand veld | Type |
|------------------|---------------|------|
| Naam | `name` | String |
| Type / rol | `role` | `human \| mascot \| animal \| object \| other` |
| Beschrijving | `description` | String |
| Persoonlijkheid | `personality` + `personalityMemory` | String (dubbel) |
| Visuele regels | `visualKeywords`, `appearanceMemory`, `defaultClothing`, `defaultAccessories` | String |
| Referenties | `referenceImageUrl`, `referenceStorageKey`, `primaryReferenceImageId`, `referenceNotes`, mouth overlay URLs | String |
| Wereld | `worldProfileId` | FK → StudioWorldProfile |
| Continuity | `continuityNotes`, `identityStrength`, `continuityStrength` | String / enum |
| Voice (sub-identity) | `voiceEnabled`, `voiceProfile`, `voiceProfilesJson`, … (10+ velden) | mixed |
| Performance (sub-identity) | `defaultSmileStrength`, `idleAnimationStyle`, mouth animation URLs | mixed |
| Tags | *niet opgeslagen* — afgeleid: `[role, mascot?, …visualKeywords]` | runtime |

#### StudioLocation

| Identity-concept | Bestaand veld |
|------------------|---------------|
| Naam | `name` |
| Type | `category` (city, restaurant, garden, …) |
| Beschrijving | `description` |
| Visuele identiteit | `visualIdentity`, `environmentKeywords`, `worldMemory` |
| Referenties | `referenceImageUrl`, `referenceStorageKey` |
| Wereld | `worldProfileId` |
| Continuity | `continuityNotes`, `continuityStrength` |

#### StudioProp

| Identity-concept | Bestaand veld |
|------------------|---------------|
| Naam | `name` |
| Type | `category` (phone, brand_asset, …) |
| Beschrijving | `description` |
| Visuele regels | `appearanceMemory`, `brandingRules` |
| Referenties | `referenceImageUrl`, `referenceStorageKey` |
| Wereld | `worldProfileId` |
| Continuity | `continuityNotes`, `continuityStrength` |

#### StudioWorldProfile

| Identity-concept | Bestaand veld |
|------------------|---------------|
| Naam | `name` |
| Beschrijving | `description` |
| Visuele stijl | `visualStyle` |
| Sfeer / toon | `tone` |
| Continuity / regels | `continuityRules`, `continuityStrength` |
| Referenties | **geen** reference image |
| Wereld | *is* de wereld (parent); children hebben `worldProfileId` |

### TypeScript-lagen (drie niveaus)

1. **Portable Snapshot** (`CharacterSnapshot` etc.) — 6 velden voor Motion handoff
2. **Memory Snapshot** (`CharacterMemorySnapshot` etc.) — volledige continuity bundle
3. **API ListItem/Detail** (`StudioCharacterListItem` etc.) — alles inclusief voice/performance

Mapping: `studio-memory-mappers.ts` → `toCharacterMemorySnapshot()` vult `personalityMemory` fallback met `personality`.

---

## Welke velden overlappen

| Generiek Identity Spec-concept | Character | Location | Prop | World |
|--------------------------------|-----------|----------|------|-------|
| **naam** | `name` | `name` | `name` | `name` |
| **type** | `role` | `category` | `category` | — |
| **beschrijving** | `description` | `description` | `description` | `description` |
| **persoonlijkheid** | `personality` + `personalityMemory` | — | — | `tone` (sfeer) |
| **visuele regels** | `visualKeywords`, `appearanceMemory`, clothing/accessories | `visualIdentity`, `environmentKeywords`, `worldMemory` | `appearanceMemory`, `brandingRules` | `visualStyle`, `continuityRules` |
| **kleurthema** | *deels in* `visualKeywords` | *deels in* `environmentKeywords` | — | *deels in* `visualStyle` |
| **referenties** | ref image + notes + mouth assets | ref image | ref image | — |
| **wereld** | `worldProfileId` | `worldProfileId` | `worldProfileId` | self |
| **gebruikscontext** | `continuityNotes` | `continuityNotes` | `continuityNotes` | `continuityRules` |
| **verboden elementen** | *impliciet in* `continuityNotes` | idem | idem | `continuityRules` |
| **tags** | derived | derived | derived (category + slug) | — |
| **continuity metadata** | `identityStrength`, `continuityStrength` | `continuityStrength` | `continuityStrength` | `continuityStrength` |
| **memory metadata** | appearance/personality memory velden | worldMemory, visualIdentity | appearanceMemory | visualStyle, tone |

**Conclusie:** ~70% van een generieke Identity Spec **bestaat al**, verspreid over verschillende veldnamen per kind. Geen enkel veld heet `visualRules`, `colorTheme`, `forbiddenElements`, of `usageContext`.

---

## Welke metadata dubbel voorkomt

1. **`personality` vs `personalityMemory`** (character) — form bewerkt `personality`; mapper vult memory fallback; consistency leest beide.
2. **`description` vs `appearanceMemory` / `visualIdentity`** — beschrijving in create-form vs rijkere memory in DB (vaak leeg).
3. **`continuityNotes` vs `continuityRules` vs `brandingRules`** — zelfde concept (regels), andere namen per kind.
4. **`visualKeywords` vs `environmentKeywords`** — zelfde functie (keyword string), andere entiteit.
5. **`worldMemory` (location) vs `WorldMemorySnapshot`** — locatie-specifiek vs wereld-profiel.
6. **Snapshot vs MemorySnapshot vs DB row** — drie representaties van dezelfde entiteit.
7. **Tags** — opnieuw berekend in registry vs keywords in DB.
8. **Voice identity** — apart subsysteem (`VoiceIdentityPlan`) naast character voice DB-velden.

---

## Welke systemen identity-data gebruiken

| Systeem | Leest identity-velden | Schrijft identity-velden |
|---------|----------------------|--------------------------|
| Scene image planner | **Volledige memory bundle** + reference URLs | Alleen generated prompt (niet library) |
| Consistency | Memory snapshots vs scene image text | `SceneConsistencyReport.memoryReferences` |
| Vision QA | Memory + refs vs generated still | Vision report (niet library) |
| Director proposal | name, description, role/category, personality, visualKeywords, brandingRules | Proposal refs only (apply → scene links) |
| Continuity / recurring | name, description, personality, category, visualStyle | Geen |
| Project memory | ids + voiceProfile stats | Geen |
| Voice identity | voice* velden per character | Geen (plan only) |
| Asset evolution | ids, names, worldProfile | Geen |
| Visual production | presence + planner warnings | Geen |
| Shot planner | **Geen** identity memory | Geen |
| Asset create sheet | — | name, description, ref, worldProfileId (minimaal) |
| Character form | description, personality, voice, performance | Zelfde subset |
| Memory tab (character) | Alle memory velden | **Read-only** |
| Location/prop detail | overview only | Geen memory UI |

**Sterkste consumers:** Scene Image Planner, Consistency, Memory Prompt pipeline.

**Zwakste consumers:** Shot Planner, Visual Production summary, Asset Create Sheet.

---

## Welke systemen eenvoudig kunnen aansluiten

| Systeem | Waarom eenvoudig |
|---------|------------------|
| **Scene Image Planner** | Gebruikt al `SceneMemoryBundle`; Identity Spec Engine = single mapper → bundle |
| **Consistency** | Input is `SceneConsistencyMemoryInput` — 1:1 met memory snapshots |
| **Continuity / recurring** | Match haystack kan uit Identity Spec `searchText()` komen |
| **Director proposal matching** | `scoreAssetMatch` velden mappen op Identity Spec |
| **Asset evolution** | Alleen ids/names; optioneel identity completeness score later |
| **Project memory** | Blijft id-based; kan `identityCompleteness` stat toevoegen zonder schema |
| **Voice identity** | Character Identity extension — voice blijft apart subsysteem, gekoppeld via `characterId` |
| **Vision QA** | Vergelijkt al memory vs image; Identity Spec = canonical memory source |

---

## Welke systemen moeilijk aansluiten

| Systeem | Waarom moeilijk |
|---------|-----------------|
| **Shot planner** | Cinematic alleen (shotType, camera, emotion) — geen asset identity vandaag |
| **Visual production panel** | Telt presence, geen memory depth — grote UX/API uitbreiding nodig |
| **Asset create sheet** | Bewust minimaal; Identity Builder = aparte flow of uitgebreide sheet |
| **World zonder reference image** | Geen visuele anchor; identity puur tekstueel |
| **Upload → Identity Spec** | Vision stack is QA-oriented, geen extraction pipeline |
| **Motion handoff** | Portable snapshots missen memory — handoff upgrade nodig |
| **Performance / mouth animation** | Character-only, geen generiek model |

---

## Welke velden ontbreken (voor generieke Identity Spec)

| Veld | Status | Opmerking |
|------|--------|-----------|
| `colorTheme` | **Ontbreekt** | Deels afleidbaar uit keywords; geen dedicated veld |
| `forbiddenElements` | **Ontbreekt** | Alleen free-text in continuityRules/Notes |
| `usageContext` | **Ontbreekt** | Geen expliciet veld (scene-rol, merkcontext) |
| `visualRules` (unified) | **Conceptueel** | Verspreid over 4+ veldnamen |
| `references[]` (multi-ref) | **Gedeeltelijk** | `primaryReferenceImageId` bestaat; geen gallery model |
| `tags` (persisted) | **Ontbreekt** | Alleen derived at runtime |
| `identitySpecVersion` | **Ontbreekt** | Geen versioning van identity wijzigingen |
| World reference image | **Ontbreekt** | World is text-only identity |
| Prop `visualKeywords` | **Ontbreekt** | Alleen appearanceMemory + brandingRules |
| Legal / uniqueness flag | **Ontbreekt** | Geen disclaimer-veld |

**Geen blocker:** ontbrekende velden kunnen P1/P2 zijn; P0 kan mappen op bestaande DB-velden.

---

## Upload-analyse (haalbaarheid, geen implementatie)

### Wat bestaat

| Capability | Pad | Geschikt voor upload→spec? |
|------------|-----|----------------------------|
| Image upload + resize | `/api/uploads/images`, sharp | Storage only ✓ |
| OpenAI Vision (Studio QA) | `studio-vision-providers/openai-vision-provider.ts` | **QA**, niet extractie ✗ |
| OCR / text detect | `image-text-detection/` | Text blocks only |
| Preflight vision | `instant-premium/openai-preflight-vision.ts` | Logo/text risk flags |
| Local heuristics | `text-avoid-zone-heuristics.ts` (mascot colors) | Export pipeline only |

### Upload flows vandaag

- Character/location/prop forms: upload → `referenceImageUrl` — **geen analyse**
- Memory velden: API accepteert ze; UI stuurt ze niet mee bij create

### Haalbaarheid: upload → Identity Spec **zonder generatie**

| Aspect | Beoordeling |
|--------|-------------|
| Technisch | **Hoog** — OpenAI multimodal + bestaande memory schema als target |
| Hergebruik | Upload API + validation layer + memory mappers |
| Ontbrekend | Dedicated **extraction** prompt + JSON schema + review UI |
| Risico | Studio Vision prompts zijn comparison-QA; verkeerde prompt hergebruiken |
| Geen generatie nodig | Enkele vision LLM call → map naar `appearanceMemory`, `visualKeywords`, etc. |

**Verdict:** Haalbaar als **P1 add-on**; niet als onderdeel van Identity Spec Engine zelf.

---

## Preset-concept (beoordeling, niet bouwen)

| Kind | Preset-dimensies | Bestaande presets |
|------|------------------|-------------------|
| **Character** | type, stijl, persoonlijkheid, outfit, accessoires, stem | Voice: `studio-voice-profiles.ts` ✓; role enum ✓; performance defaults ✓; **geen** visual/personality presets |
| **Location** | stijl, sfeer, architectuur, materialen, verlichting | Category enum ✓; **geen** structured presets |
| **Prop** | functie, materiaal, vorm, merkstijl | Category enum ✓; `brand_asset` category hint |
| **World** | visuele regels, sfeer, verboden stijlen, kleurregels, audioregels | Free-text fields ✓; **geen** preset library |

**Conclusie:** Presets zijn **logisch en wenselijk**, vooral voor onboarding. Voice presets bewijzen het patroon. Visual/personality presets ontbreken volledig. Presets moeten **Identity Spec defaults vullen**, geen aparte parallelle systemen.

---

## Uniekheid (beoordeling)

Identity kan worden opgebouwd uit **combinaties** zonder juridische claim:

- **Rol + wereld + visuele regels + persoonlijkheid** → onderscheidende prompt-identiteit
- **Reference image + appearanceMemory + visualKeywords** → visuele handtekening in consistency/vision
- **Voice profile + performance** → auditieve/gesture identiteit (character-only)
- **Project memory usage** → “eigen merkidentiteit” in projectcontext (hergebruik, geen IP-claim)

Aanbevolen disclaimer (UI copy, geen veld vandaag):

> *“Ontworpen als eigen merkidentiteit. Juridische bescherming vereist aparte controle.”*

Geen `uniquenessScore` of juridische validatie — bewust buiten scope.

---

## Antwoorden op de 10 vraagstukken

1. **Welke velden bestaan al?** — Zie tabellen hierboven; memory snapshots dekken ~70% generieke spec.
2. **Welke ontbreken?** — colorTheme, forbiddenElements, usageContext, persisted tags, multi-ref gallery, world ref image, identity versioning.
3. **Welke overlappen?** — personality/personalityMemory, description vs appearanceMemory, continuityNotes vs continuityRules vs brandingRules, keywords per kind.
4. **Dubbele metadata?** — Snapshot/Memory/DB triple, derived tags, voice plan vs DB voice fields.
5. **Systemen met identity-data?** — Scene image, consistency, vision, director, continuity, voice (character).
6. **Voice Identity aansluiten?** — Ja, als **CharacterIdentityVoice** extension; resolver blijft bestaan.
7. **Visual Production?** — Gedeeltelijk; kan asset-gap redenen uit Identity Spec completeness halen (P1).
8. **Shot Planner?** — Niet zonder nieuwe koppeling shot → required asset identity (P2).
9. **Continuity?** — Ja; recurring haystack uit unified `toSearchHaystack()`.
10. **Project Memory?** — Ja; usage blijft id-based; optioneel completeness % per asset (P1).

---

## Welke risico's bestaan

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| **4 parallelle Identity builders** | Hoge duplicatie, inconsistent UX | Eén `IdentitySpecEngine` + kind-specific mappers |
| **Schema migratie te vroeg** | JSON `identitySpec` column lock-in | TypeScript facade over bestaande kolommen (P0) |
| **Memory UI blijft read-only** | Identity Spec bestaat alleen in DB/API | P0 = Identity Builder UI voor memory velden |
| **personality vs personalityMemory** | Verwarring, inconsistent prompts | Engine merge-regel (zoals mapper vandaag) |
| **World zonder visuele ref** | Zwakkere world identity | P2 world moodboard / ref image optioneel |
| **Vision QA ≠ extraction** | Verkeerde hergebruik | Aparte analyze-reference service |
| **Shot planner blijft los** | Identity incompleet in cinematic flow | Expliciet P2; geen fake integratie |
| **Props second-class** | Identity engine negeert props | Pariteit in mappers vanaf P0 types |

---

## Welke architectuur het meest logisch is

### Aanbeveling: **Facade-first Identity Spec Engine** (geen nieuwe DB-tabel P0)

```
┌─────────────────────────────────────────────────────────┐
│              Identity Spec Engine (TS)                   │
│  IdentitySpecBase + Character|Location|Prop|World ext   │
│  toIdentitySpec(entity) / fromIdentitySpec(draft)       │
│  toMemorySnapshot() / toSearchHaystack() / completeness │
└──────────────────────────┬──────────────────────────────┘
                           │ mapt op bestaande kolommen
┌──────────────────────────┴──────────────────────────────┐
│  StudioCharacter │ StudioLocation │ StudioProp │ World  │
└──────────────────────────┬──────────────────────────────┘
                           │
     Consumers: memory-prompt, consistency, director,
                 continuity, scene-image-planner, (future UI)
```

**Niet bouwen:** aparte `CharacterIdentity`, `LocationIdentity`, … **services** met eigen persistence.

**Wel bouwen (later):**

- `IdentitySpecBase` type + per-kind extensions
- Mappers bidirectioneel DB ↔ Spec
- `IdentityBuilderPanel` UI (edit memory + voice tab voor character)
- Optional: `analyzeReferenceImage()` → draft spec (P1)

**Asset ≠ afbeelding:** Identity Spec Engine behandelt `referenceImageUrl` als **één referentie-aspect**, niet als identiteit zelf. Identiteit = memory velden + type + world linkage + (character) voice/performance.

**Toekomstige kinds** (voertuigen, dieren, merkpersonages): uitbreiden via `role` / `category` enums + optionele `IdentityKind` union — geen nieuwe engines.
