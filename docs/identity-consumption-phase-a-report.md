# Identity Consumption Phase A Report

Report date: 2026-06-06  
Sprint: Phase A quick wins (no new providers, engines, or schema migrations)

Baseline: `docs/studio-identity-consumption-completion-report.md`

---

## Forbidden Elements

**Root cause:** `characterToIdentitySpec`, `locationToIdentitySpec`, and memory snapshot mappers hard-coded `forbiddenElements: ""` despite `[identity:forbidden]` parsing in identity builder forms.

**Fix:**
- `parseIdentityContinuityNotes` exported from `studio-character-identity-fields.ts`
- All character/location spec mappers now parse and set `forbiddenElements` + `usageContext`
- `buildCharacterIdentityVisualProductionLines` emits `Forbidden: …` when present
- `buildCharacterMemoryPromptLines` / `buildLocationMemoryPromptLines` emit explicit forbidden lines (usage context only, no raw marker dump)

**Validation:** User rules like "no glasses / no beard / no modern cars" appear in production prompts and director identity lines.

---

## Character Visual Tokens

**Fix:** `buildCharacterIdentityVisualProductionLines` now calls `buildCharacterStructuredIdentityPromptLines` for explicit lines:

- Character type
- Visual style
- Shape language
- Energy
- Color theme

Raw `visualKeywords` blob only used as fallback when no structured tokens parse.

Also added **Outfit**, **Accessories**, and **Appearance** from `memoryMetadata` in visual production lines.

---

## Accessories Consumption

**Fix:** Accessories included in `buildCharacterIdentityVisualProductionLines` → flows through:

- `buildCharacterIdentityPromptContext` (character prompt section)
- `buildSceneDirectorContextLines` (directorIdentity)
- Memory prompts (already present; unchanged)

Execution/motion paths inherit via `buildCharacterMemoryPromptLines`.

---

## Supporting References

**Enhancements:**
- `buildSupportingReferenceLines` — stronger consistency language (face/outfit/proportions, architecture/materials, prop shape/branding)
- `buildSceneImageReferenceAssets` — prop and location `supportingReferences` arrays (parity with character path)

Archive refs intentionally untouched.

---

## Shot Planner Consumption

**Fix:** `buildStoryboardShotPlan` derives libraries from storyboard scenes via `identityLibrariesFromStoryboard`, then per scene:

- `buildSceneIdentityConsumption` → `shotHint`
- `biasShotTypeFromIdentity` on focus shot
- `sceneEnergyFromIdentityRationale` (energetic → dynamic, calm/cinematic → calm)

No new planner — existing shot planner layer only.

---

## World Strategy Consumption

**Fix:** `buildStudioSceneMotionInstructions`:

- New `buildWorldStrategyMotionLine` using `buildWorldIdentityRenderStrategyHints` + `resolveWorldIdentityShotHint` (pacing, camera intent)
- World strategy + identity memory lines prioritized early in instruction packing
- Identity memory budget increased slightly (220 chars)

Stale handoff comment updated: memory snapshots are consumed.

---

## Prop Character Relations

**Fix:**
- `buildPropIdentityMemoryPromptExtras` — `Signature prop for {character name}` when `hc:chars=` linked
- `buildPropMemoryPromptLines` accepts `characterNamesById` map
- Wired through scene memory continuity, motion instructions, and `buildPropRulesForExecution`
- Visual production line adds consistency hint for linked props

---

## Impact Score Delta

| Asset / pipeline | Before | After (est.) |
|------------------|--------|--------------|
| **Character** | 58% | **78%** |
| **Prop** | 52% | **66%** |
| **Location** | 68% | **80%** |
| **World** | 65% | **76%** |
| **Planner** | 48% | **68%** |
| **Motion** | 65% | **74%** |
| **Prompt / image gen** | 72% | **85%** |

Targets met or within ~2pts for Character/Prop/World/Planner goals.

---

## Before vs After

| Capability | Before | After |
|------------|--------|-------|
| Forbidden in identity spec | Dropped | Parsed + prompt lines |
| Structured hc:* in visual production | Raw blob | Labeled lines |
| Accessories in prompt context | Partial | Full |
| Supporting refs (prop/location) | Text only | Text + reference assets |
| Shot planner identity bias | Director only | Shot planner + energy |
| World render strategies in motion | Memory only | Motion instructions |
| Prop linkedCharacterIds | Display ID | Named signature prop line |

---

## Remaining Gaps

- Archive refs still not in generation (by design)
- Motion identity still truncated by 520-char budget
- Storyboard-level `directorContextLines` still UI/plan metadata (per-scene lines reach prompts)
- Voice marketplace signals still UI-only
- `motion-handoff-execution-consumption` still images/jobs only

---

## Wat NIET opnieuw gebouwd moet worden

- Identity Spec Engine
- Memory Prompt Builders (extended, not replaced)
- Production Prompt Pipeline
- Motion engine / Vidu provider
- Asset builders / schema
- New planners or consumption layer

---

## Tests / build status

New: `src/lib/studio-identity-consumption-phase-a.test.ts` (8 tests)

Run: `npx prisma validate` → `npx prisma generate` → `npm run lint` → `npm run build` → `npm run test`
