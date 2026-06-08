# Studio Consumption Reality Audit

Report date: 2026-06-06  
Scope: audit-only — no code changes, no new AI, no schema migrations.

**Conclusion:** Studio is **partially metadata-driven**. It is **not** name + image only, but also **not** fully identity-driven. Strongest consumption sits in **generation (memory prompts)** and **voice (planning → TTS → mux)**. Director and planners mainly use **haystack matching, shot bias, and completeness UI**. Motion **render** consumes mostly **scene stills + text beats + execution plans**; rich memory snapshots are **stored but not rendered**.

---

## Character Metadata

| Field | Produced | Storyboard | Director | Planner | Asset decisions | Generation | Motion | Status |
|-------|----------|------------|----------|---------|-----------------|------------|--------|--------|
| **characterType** | `hc:type=` in `visualKeywords` | Partial (raw string) | Partial (shot hint via `resolveCharacterIdentityShotHint`) | Partial | Partial (role → type) | Partial (in `visualKeywords`) | Partial | **Partial** |
| **visualStyle** | `hc:style=` in `visualKeywords` | Partial | Partial (visual production lines) | Partial | Partial | Partial | Partial | **Partial** |
| **shapeLanguage** | `hc:shape=` in `visualKeywords` | Partial | **Ignored** | **Ignored** | **Ignored** | Partial (raw blob) | Partial | **Mostly ignored** |
| **energy** | `hc:energy=` in `visualKeywords` | Partial | Partial (shot hint only) | Partial | **Ignored** | **Ignored** | **Ignored** (scene `sceneEnergy` wins) | **Partial / split** |
| **outfit** (`defaultClothing`) | DB column | **Consumed** | Partial | Partial | **Ignored** | **Consumed** (`buildCharacterMemoryPromptLines`) | **Consumed** (`buildCharacterRulesForExecution`) | **Consumed** |
| **accessories** | DB column | **Consumed** | Partial | Partial | **Ignored** | **Consumed** | **Consumed** | **Consumed** |
| **personality** | DB + `personalityMemory` | **Consumed** | **Consumed** (voice) | Partial | Partial | **Consumed** | Partial (drift check uses description, not outfit) | **Consumed** |
| **colorTheme** | `hc:color=` in `visualKeywords` | Partial | Partial | Partial | **Ignored** | Partial | Partial (`canonicalIdentity` built, not read) | **Partial** |
| **voice** | voice columns | **Consumed** | **Consumed** | Partial (audio flags) | **Ignored** | **Ignored** (image gen) | **Consumed** (TTS/mux/handoff) | **Consumed** (audio path) |
| **worldProfileId** | FK | **Consumed** | Partial | **Consumed** (dominant world) | Partial | **Consumed** | **Consumed** | **Consumed** |
| **continuityNotes** | DB | **Consumed** | Partial | Partial | Partial | **Consumed** (verbatim) | **Consumed** | **Consumed** |
| **forbiddenElements** | embedded in `continuityNotes` | **Consumed** (as notes) | **Ignored** (structured) | **Ignored** | Partial | Partial (via full notes dump) | Partial | **Partial** |
| **canonicalReferences** | `referenceNotes` JSON | Partial | **Ignored** | **Ignored** | **Ignored** | Partial (`referenceImageUrl` only) | Partial (stored, not in Vidu prompt) | **Mostly UI+QA** |
| **appearanceMemory** | DB | **Consumed** | **Consumed** | **Consumed** | **Ignored** | **Consumed** | **Consumed** | **Consumed** |

**Storage:** no dedicated columns for type/style/shape/energy/color — encoded in `visualKeywords` tokens via `studio-character-identity-fields.ts`.

**Key consumers:** `buildCharacterMemoryPromptLines` (`studio-memory-prompt.ts`), `buildCharacterIdentityVisualProductionLines` (`studio-character-identity-visual-hints.ts`), `buildCharacterRulesForExecution` (`studio-scene-execution.ts`), director voice resolution (`studio-director-proposal-builder.ts`).

---

## Voice Metadata

| Field | Director | Voice planning | TTS | Motion render | Character memory |
|-------|----------|----------------|-----|---------------|------------------|
| **voiceProfile** | ✅ | ✅ | ✅ | ✅ (mux/metadata) | Project memory only |
| **Clone voices** | ✅ (via ref) | ✅ | ✅ | ✅ | — |
| **Language overrides** | ✅ | ✅ | ✅ | Partial (story lang + plan blob) | ❌ |
| **compatibilityScore** | ❌ | ❌ | ❌ | ❌ | ❌ (UI + `voiceNotes` only) |
| **Accent metadata** | ❌ | ❌ | ❌ | ❌ | ❌ (marketplace only) |
| **voiceNotes** | ❌ | ❌ | ❌ | ❌ | ❌ (Voice Center UI only) |
| **Voice memory** (`[hc:voice-selection]`) | ❌ | ❌ | ❌ | ❌ | ❌ |

Voice reaches **Director, Voice Director, Orchestration, TTS, and Motion handoff** — not TTS-only. Marketplace signals (compatibility, accent) and `voiceNotes` do **not** propagate into planning or handoff logic; only the chosen `voiceProfile` ref does.

`CharacterMemorySnapshot` contains no voice fields (`studio-memory-snapshots.ts`).

---

## World Metadata

| Field | Director | Planner | Generation | Motion |
|-------|----------|---------|------------|--------|
| **Profile** (name/desc) | Haystack + `resolveWorldRef` | `dominantWorldName` | Memory header | Snapshot name |
| **Style** (visualStyle, shape, color, lighting) | Visual production lines → proposal | Completeness UI | `buildWorldIdentityMemoryPromptExtras` | Stored in `worldMemory` |
| **Mood** | Shot hint (secondary) | — | Memory visual lines | Stored only |
| **Rules** (forbidden, brand, audio) | Haystack + production lines | Rule presence UI | Memory extras | Stored only |
| **Locations** (linked assets) | Via `worldProfileId` on entities | Asset present/missing | World name in prop/location lines | — |
| **Continuity** (shots, camera, render strategies) | Shot bias only | Render strategy: world **name** only | Shots/camera **not** in memory lines | Stored only |

World reaches Director, Generation, and Motion (stored) — not UI-only. `buildWorldIdentityRenderStrategyHints` exists but is **dead** (only called in tests).

---

## Prop Metadata

| Field | Director | Planner | Asset decisions | Generation | Motion |
|-------|----------|---------|-----------------|------------|--------|
| **Type** (`propType`) | Shot hint + haystack | Asset evolution | — | Memory extras | **Name only** |
| **Style** (`styleId`) | Visual lines | Completeness | — | Memory extras | — |
| **Context** (`continuityNotes`) | Haystack | — | Idea-text prefill | **Raw in memory prompt** | Stored |
| **Canonical refs** (`referenceImageUrl`) | Completeness | Readiness | — | Reference asset + consistency line | Not in Vidu prompt |
| **Continuity** (`brandingRules`) | Haystack | Completeness | — | Memory prompt | Stored |
| **linkedCharacterIds** | One visual line | — | — | Visual line only | **Dead** |

---

## Location Metadata

| Field | Director | Planner | Asset decisions | Generation | Motion |
|-------|----------|---------|-----------------|------------|--------|
| **Type** (`locationType`) | Shot hint + haystack | Asset evolution | — | Memory extras | — |
| **Style** (environmentKeywords) | Visual lines | Completeness | — | Memory extras + raw keywords | — |
| **Context** (`continuityNotes`) | Haystack | — | Idea-text prefill | **Raw in memory prompt** | Stored |
| **Canonical refs** | Completeness | Readiness | — | Reference asset | — |
| **architecture/materials/color/lighting** | Haystack + extras | — | — | Memory extras | Snapshot only |

Prop/location canonical reference lib exists (`studio-asset-canonical-references.ts`); production still uses primarily one `referenceImageUrl`.

---

## Director Consumption

**What reaches Director prompts / proposals:**

| Source | Data |
|--------|------|
| **Character** | Haystack; shot bias (`characterType`, `energy`, `role`); visual production lines → `identityConsumption.directorContextLines`; **voice** fully |
| **World** | Haystack; `resolveWorldRef`; shot bias; dominant world name |
| **Location** | Haystack; shot bias (`locationType`); recurring detection |
| **Prop** | Haystack; shot bias (`propType`, `propFunction`) |
| **Voice** | Story + cast profiles, language overrides, narration mode |

**Missing in Director:**
- `compatibilityScore`, accent metadata, `voiceNotes`
- Structured `forbiddenElements` (characters)
- `canonicalReferences` bundle (beyond primary image URL)
- `shapeLanguage`, `colorTheme` as dedicated prompt lines
- AI Director interpreter — story arc only, no identity fields

**Note:** `identityConsumption.directorContextLines` are mainly **proposal UI / warnings** — not injected into LLM enrichment chains.

---

## Planner Consumption

| Planner | Identity metadata used | Ignored |
|---------|------------------------|---------|
| **Production planner** | `dominantWorldName`; identity completeness; asset present/missing | Per-field visual/audio lines not copied into plan |
| **Shot planner** | **None** — AI director direction only | All identity shot hints |
| **Animation planner** | **Dead call** — `buildStoryboardIdentityConsumption()` result discarded | Everything |
| **Render strategy** | World **name** only | `buildWorldIdentityRenderStrategyHints` never called |
| **Asset decisions** | id/name/mode; minimal prefill | Structured identity fields |

---

## Generation Consumption

**Two paths (split-brain):**

| Path | Identity section | Memory continuity |
|------|------------------|-------------------|
| **Server production** (`buildScenePromptFromSceneRow`) | ❌ No `sourceEntities` → `sections.identity` empty | ✅ `buildSceneMemoryContinuityPrompt` |
| **UI preview** (`StudioScenePromptPreview`) | ✅ With `sourceEntities` | ✅ |

**Reaches provider prompts (server):**
- Character: appearance, clothing, accessories, personality, visualKeywords, continuityNotes, world name
- Location: visualIdentity, environmentKeywords, structured extras, continuityNotes
- Prop: type/function/shape/material via extras, brandingRules, continuityNotes
- World: visualStyle, tone, continuityRules via extras
- Reference images: primary `referenceImageUrl` → consistency lines

**Does not reach:** `canonicalIdentity` object, supporting/archive refs, parsed `hc:*` tokens as separate lines.

---

## Motion Consumption

**Actively used for render/execution:**
- Scene still URLs (`selectedSceneImageUrl`)
- Text beats / scene title-description-action
- Vidu / animation / render execution plans
- Voice: post-render audio mux + performance preview

**Stored but not rendered** (`motion-handoff-payload.ts` — *"not used in rendering yet"*):
- `characterMemory`, `worldMemory`, `locationMemory`, `propMemory`
- Style/continuity prompts in `studioContext`
- `canonicalIdentity`, outfit, color theme
- Voice identity plan blobs (QA/import UI)

**Motion instructions** (`build-studio-scene-motion-instructions.ts`): location **name**, prop **names** + placement — no style/mood/continuity.

Motion payload is rich; **render pipeline** consumes mostly stills + text + plans.

---

## Dead Metadata

Ranked by impact:

| # | Metadata | Where stored | Impact |
|---|----------|--------------|--------|
| 1 | **Identity prompt section** (`sourceEntities`) | UI preview only | Server generation misses structured identity context that preview shows |
| 2 | **`canonicalIdentity`** on memory snapshots | Built in mappers | Never read by prompt/execution builders |
| 3 | **Supporting/archive canonical refs** | `referenceNotes` JSON | Only primary image URL in generation |
| 4 | **`buildWorldIdentityRenderStrategyHints`** | World continuityRules | Function exists, never called in planner |
| 5 | **Animation planner identity consumption** | — | Call without result use |
| 6 | **`compatibilityScore` + accent metadata** | Marketplace + voiceNotes | UI only; no downstream |
| 7 | **`voiceNotes` + voice selection memory** | Character DB | Voice Center UI only |
| 8 | **Structured `forbiddenElements`** (characters) | continuityNotes marker | `characterToIdentitySpec` sets `forbiddenElements: ""` |
| 9 | **`shapeLanguage`, `colorTheme`** (characters) | visualKeywords tokens | No dedicated prompt lines (props/locations do have them) |
| 10 | **`linkedCharacterIds`** (props) | appearanceMemory | One visual line, otherwise dead |
| 11 | **Character `hc:energy`** | visualKeywords | Shot hint only; motion uses scene energy |
| 12 | **Asset decision prefill** | Decision execution | Stubs — no structured identity from decision |
| 13 | **Prop/location canonical ref bundle** | continuityNotes lib | Lib only, no pipeline CRUD |

---

## Highest Value Integration Gaps

1. **Unify prompt paths** — server generation should get the same `sourceEntities`/identity section as UI preview
2. **`canonicalIdentity` → prompt lines** — built but never consumed
3. **Director context lines → LLM enrichment** — display-only today
4. **Motion memory → execution** — snapshots stored, explicitly not used in rendering
5. **World render strategies** — data present, helper dead
6. **Structured character tokens** — parse `hc:type/style/shape/energy/color` into dedicated lines
7. **Voice marketplace signals → director** — compatibility/accent only at selection UX

---

## Top 10 Improvements (Highest Impact)

1. Pass `sourceEntities` in `buildScenePromptFromSceneRow` — close preview vs production split-brain
2. Consume `canonicalIdentity` in `buildCharacterMemoryPromptLines`
3. Wire `directorContextLines` into director enrichment (not only proposal UI)
4. Activate `worldMemory`/`characterMemory` in motion execution — or remove dead storage
5. Call `buildWorldIdentityRenderStrategyHints` in render strategy planner
6. Parse character `hc:*` tokens into structured prompt lines (like props/locations)
7. Multi-ref canonical refs in generation — supporting refs beside primary URL
8. Asset decision → full identity prefill (not name/description stub only)
9. Shot planner consumes identity shot hints (today only at proposal-build)
10. Prop/location canonical ref UI + pipeline — lib exists, consumption missing

---

## What NOT to Rebuild

- Identity Spec Engine (`studio-identity-spec-engine.ts`) — normalization layer works
- Memory prompt builders (`studio-memory-prompt.ts`) — strong consumption; extend, don't replace
- Director proposal builder — haystack + voice already wired
- Voice orchestration + TTS chain — end-to-end
- Motion handoff attach chain — structure OK; consumption needs to go deeper
- Universal Asset Wizard / Identity Builders — produce data; problem is **consumption**, not **creation**
- New AI providers, schema migrations, parallel catalogs

---

## Final Verdict

| Question | Answer |
|----------|--------|
| Is Studio metadata-driven? | **Partially** — memory prompts + voice chain are real; director/planner mostly matching + UI |
| Does it run on name + image? | **No** for generation (outfit, appearance, continuity, world extras) and voice |
| Does Motion run on name + image? | **Render: yes** (stills + text + plans). **Payload: no** (rich metadata carried, unused) |
| Biggest problem | **Split-brain** between what is stored/previewed and what server generation / Motion render consumes |

---

## Key File Index

| Role | Path |
|------|------|
| Character identity ↔ storage | `src/lib/studio-character-identity-fields.ts` |
| Spec normalization | `src/lib/studio-identity-spec-engine.ts`, `studio-identity-spec-mappers.ts` |
| Consumption orchestration | `src/lib/studio-identity-consumption.ts` |
| Visual/audio line builders | `studio-*-identity-visual-hints.ts` |
| Generation memory prompts | `src/lib/studio-memory-prompt.ts`, `studio-prompt-builder.ts` |
| Server prompt (no sourceEntities) | `src/server/studio/studio-prompt-builder-service.ts` |
| UI preview (with sourceEntities) | `src/components/studio/studio-scene-prompt-preview.tsx` |
| Director proposal | `src/lib/studio-director-proposal-builder.ts` |
| Production planner | `src/lib/studio-production-planner.ts` |
| Motion payload | `src/server/studio/create-motion-handoff-payload.ts` |
| Motion execution consumption | `src/lib/motion-handoff-execution-consumption.ts` |
| Voice orchestration | `src/lib/studio-character-voice-orchestration.ts` |
