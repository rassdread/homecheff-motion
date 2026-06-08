# Identity Consumption Phase B Report

Report date: 2026-06-06  
Sprint: Director · Motion · Voice Intelligence Completion  
Baseline: Phase A (`cc7402e`) + audit reports

---

## Director Consumption

**Root gap:** Storyboard-level `directorContextLines` were plan/UI metadata; per-scene lines reached prompts only.

**Fix:**
- `mergeDirectorContextLines()` — scene-specific first, storyboard-wide second (deduped, cap 16)
- `buildPrioritizedStoryboardDirectorLines()` — asset-level lines ordered world → character → location → prop → audio
- `buildSceneDirectorContextLines()` accepts optional `storyboard` — merges storyboard + scene + voice intelligence
- Production image path (`studio-scene-image-service`) passes full storyboard into `buildScenePromptFromSceneRow`

**Impact:** Storyboard identity (visual direction, tone, continuity) now reaches `sections.directorIdentity` in image and execution prompts.

---

## Motion Consumption

**Root gap:** Identity wired but lossy — 520-char budget dropped visual style, outfit, forbidden before blocking/arc lines.

**Fix:**
- Memory chunks use explicit priority tiers (`high` / `medium` / `low`) in `studio-memory-prompt.ts`
- Motion path orders **characters before world** so outfit/forbidden survive identity truncation
- `packPrioritizedMemoryChunks()` fills high tier before medium/low within 220-char identity budget
- `packLines()` uses `dropPriority` — identity/world/safety (1–2) kept over arc/notes (5–6) when budget tight

**Preserved without larger budget:** visual style, color theme, outfit, world strategy (separate `World:` line), forbidden rules.

---

## Voice Intelligence

**Root gap:** Marketplace metadata (accent, compatibility, persona, voice memory) was UI-only.

**Fix:** `studio-voice-intelligence-consumption.ts`
- Reads `[hc:voice-selection]` memory from `voiceNotes`
- Emits director lines: voice name, compatibility %, accent storytelling hints, persona direction
- Location-based suggestions via existing `buildDirectorVoiceSuggestions`
- Wired into `buildStoryboardIdentityConsumption.directorContextLines` and per-scene `buildSceneDirectorContextLines`

**Examples now consumed:**
- Jamaican voice → Caribbean storytelling hints
- Dutch grower persona → local community tone
- British luxury narrator → premium cinematic cadence

No automatic accent mutation — advisory metadata only.

---

## Story Memory Prioritization

**Reorder (high → low):**

| Asset | High | Medium | Low |
|-------|------|--------|-----|
| Character | outfit, accessories, structured hc:*, forbidden | appearance, world link | personality, reference notes, strength boilerplate |
| World | visual style, render strategies | — | continuity strength |
| Location | visual identity, structured extras, forbidden | environment keywords | strength, usage |
| Prop | branding, linked character signature | appearance detail | continuity notes |

`buildSceneMemoryPromptChunks()` exported for motion packing.

---

## World Shot Intelligence

**Fix:**
- `WORLD_TYPE_SHOT_HINTS` extended: `documentary_universe`, `cyberpunk`
- `buildSceneShotBeats()` biases opening/detail/closing shots from world `shotHint`
- World pacing influences `beatMovement` (slow → push_in opening, fast → tracking focus)
- Food worlds force detail beats; cyberpunk/documentary bias wide/observational framing

Uses existing shot planner — no new planner engine.

---

## Canonical Reference Priority

**Fix:**
- `buildReferenceConsistencyLines()` — primary URL lines before supporting text
- Supporting refs sorted by role priority: face → outfit → detail → architecture → branding
- `buildSceneImageReferenceAssets()` — supporting arrays sorted consistently
- Primary refs labeled "primary reference" in generation prompt text

Archive refs remain out of scope.

---

## Consistency Scores

**New:** `studio-identity-consistency-score.ts`

Per scene, scores 0–100% for character/prop/location/world based on **actual prompt consumption** (identity production lines vs prompt haystack). Analysis only — no schema.

---

## Before vs After

| Pipeline | Phase A (est.) | Phase B (est.) |
|----------|----------------|----------------|
| **Director** | 62% | **82%** |
| **Motion** | 74% | **86%** |
| **Voice** | 35% | **72%** |
| **Planner** | 68% | **80%** |
| **Character** | 78% | **84%** |
| **World** | 76% | **88%** |
| **Location** | 80% | **83%** |
| **Prop** | 66% | **70%** |

Phase A → B largest gains: Director (+20), Voice (+37), Motion (+12).

---

## Remaining Gaps

- Vidu layer still does not re-inject full identity images (by design)
- Archive refs not in generation
- `motion-handoff-execution-consumption` still operational-only
- Voice hints are advisory — no TTS parameter mutation
- Consistency score is heuristic text-match, not vision verification

---

## Wat NIET opnieuw gebouwd moet worden

- Identity Spec Engine
- Memory Prompt Builders (extended priority tiers)
- Motion engine / Vidu provider
- Voice marketplace scoring engine
- Database schema
- New planners or AI providers
- Studio V2

---

## Tests / validation

New: `src/lib/studio-identity-consumption-phase-b.test.ts` (8 tests)

Coverage: storyboard director merge, motion prioritization, world shot beats, voice metadata, reference priority, consistency scores.
