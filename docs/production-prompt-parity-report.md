# Production Prompt Parity Report

Report date: 2026-06-06  
Sprint: Production Prompt Parity (post Studio Consumption Reality Audit)

---

## Source Entity Parity

**Before:** `buildScenePromptFromSceneRow()` used memory bundle only — no `sourceEntities`, empty `sections.identity`.

**After:** Production uses the same path as `StudioScenePromptPreview`:
- `buildPromptSourceEntitiesFromSceneRow()` → `studioSceneDetailToPromptInput()` → `buildScenePromptFromInput()`
- Module: `src/lib/studio-prompt-source-entities.ts`

---

## Canonical Identity Consumption

**Before:** `canonicalIdentity` built in memory mappers but not injected into prompts.

**After:** `buildCharacterIdentityPromptLinesFromMemory()` in `studio-character-identity-prompt-lines.ts` consumes:
- `canonicalIdentity.visualStyle`, `outfit`, `colorTheme`, `worldProfileName`
- Supporting reference roles (active refs)

Wired into `buildCharacterMemoryPromptLines()` (`studio-memory-prompt.ts`).

---

## Director Context Consumption

**Before:** `identityConsumption.directorContextLines` UI/proposal only.

**After:**
- Per-scene: `buildSceneDirectorContextLines()` → `PromptBuilderInput.directorContextLines` → `sections.directorIdentity` in final prompt
- Production planner + animation planner append storyboard `directorContextLines`

---

## Character Identity Token Consumption

**Before:** `hc:type/style/shape/energy/color` buried in `visualKeywords` blob.

**After:** `buildCharacterStructuredIdentityPromptLines()` emits explicit lines:
- Character type, Visual style, Shape language, Energy, Color theme

Uses existing `parseStructuredKeywordsFromVisualKeywords()`.

---

## World Strategy Consumption

**Before:** `buildWorldIdentityRenderStrategyHints()` dead (tests only).

**After:**
- Injected in `buildWorldMemoryPromptLines()` (generation continuity)
- Wired in `studio-render-strategy-planner.ts` as render strategy reasons
- i18n: `studio.renderStrategy.reason.worldRenderStrategy`

---

## Motion Memory Consumption

**Before:** `characterMemory` / `worldMemory` / `locationMemory` / `propMemory` stored; motion instructions ignored.

**After:** `buildStudioSceneMotionInstructions()` accepts `storyMemory` from handoff payload; compact `Identity:` line via existing memory prompt builders.

Wired in `studio-motion-handoff-map.ts` and `resolveStudioMotionInstructionsBySceneIndex()`.

---

## Multi Reference Continuity

**Before:** Only primary `referenceImageUrl` in generation.

**After:**
- `buildSupportingReferenceLines()` in `studio-scene-image-prompt.ts`
- `buildSceneImageReferenceAssets()` includes `supportingReferences` per character
- Uses `parseCharacterReferencesBundle()` + `parseAssetReferencesBundle()`

---

## Preview vs Production Comparison

Tooling: `src/lib/studio-prompt-parity.ts`
- `comparePreviewAndProductionPrompts()` — section-level diff
- `productionPromptHasIdentityContext()` — sanity check

Tests: `src/lib/studio-prompt-parity.test.ts`

**Result:** Same input → identical preview and production prompts.

---

## Remaining Dead Metadata

| Item | Status after sprint |
|------|---------------------|
| `buildWorldIdentityRenderStrategyHints` | ✅ Now used (memory + render strategy) |
| Animation planner identity consumption | ✅ Now used in `directorContextLines` |
| `canonicalIdentity` | ✅ Consumed in character memory prompts |
| `sourceEntities` split-brain | ✅ Fixed |
| Voice marketplace signals | Still UI-only (out of scope) |
| Archive refs in generation | Not injected (supporting only) |
| Full `identityConsumption` in LLM enrichment chains | Partial — lines in prompts, not separate LLM pass |

---

## Build/Test Status

Run: `prisma validate` → `prisma generate` → `npm run lint` → `npm run build` → `npm run test`

---

## Key Files

| File | Role |
|------|------|
| `studio-prompt-source-entities.ts` | Shared sourceEntities + director lines |
| `studio-prompt-builder-service.ts` | Unified production entry |
| `studio-character-identity-prompt-lines.ts` | HC tokens + canonical identity |
| `studio-memory-prompt.ts` | Memory continuity enrichment |
| `studio-prompt-parity.ts` | Parity validation |
| `studio-scene-image-prompt.ts` | Multi-ref continuity |
| `build-studio-scene-motion-instructions.ts` | Motion memory context |
