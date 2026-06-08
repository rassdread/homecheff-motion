# Studio Identity Consumption Completion Report

Report date: 2026-06-06  
Scope: audit-only — no code changes, no new providers, no schema migrations.

**Baseline:** Post–Production Prompt Parity sprint (`e0857f6`) and Identity Consumption Consolidation. This report re-audits the full chain from user input → storage → read → Director / Planner / Prompt Builder / Motion.

**Headline:** Studio is **meaningfully metadata-driven** for image generation and memory continuity, but **uneven** across asset kinds. Character structured visual tokens and forbidden rules are the largest remaining gaps. Motion now consumes memory snapshots in instructions (post-parity), but with **heavy truncation** and **no Vidu-level identity re-injection**.

---

## Character Impact

| Field | Stored | Read | Director | Planner | Prompt / generation | Motion | Score |
|-------|--------|------|----------|---------|---------------------|--------|-------|
| **shapeLanguage** | `visualKeywords` `hc:shape=` | `studio-character-identity-fields.ts`, `parseStructuredKeywordsFromVisualKeywords` | Shot hint only (via type/energy, not shape) | Completeness UI | **Memory:** `buildCharacterStructuredIdentityPromptLines` → continuity. **Visual production:** raw `visualKeywords` blob only | Compact `Identity:` line via memory builders (~200 char cap) | **55%** |
| **colorTheme** | `hc:color=` | Same parsers | `directorIdentity` (unparsed blob) | Completeness | Memory structured lines + `canonicalIdentity` lines | Truncated in motion identity line | **60%** |
| **energy** | `hc:energy=` | Form + shot hint resolver | **Shot bias** (`biasShotTypeFromIdentity`) | — | Memory structured lines; **not** explicit in `buildCharacterIdentityVisualProductionLines` | Scene `sceneEnergy` wins over character energy in animation planner | **50%** |
| **forbiddenElements** | `continuityNotes` `[identity:forbidden]` | Form parser | **Dropped** — `characterToIdentitySpec` sets `forbiddenElements: ""` | Readiness only | May leak via full `continuityNotes` dump in memory; **not** structured forbidden line | Not in motion rules unless in notes blob | **25%** |
| **canonicalReferences** | `referenceNotes` JSON + `referenceImageUrl` | `studio-character-canonical-references.ts` | Completeness / readiness | Readiness | Primary URL → image provider + consistency text; supporting → prompt text + `referenceAssets` | Stored in handoff; not re-sent as images to Vidu | **45%** |
| **supportingReferences** | `referenceNotes.supporting[]` | `parseCharacterReferencesBundle` | UI overview | Readiness | `buildSupportingReferenceLines` + provider settings | Text-only in motion (no pixel conditioning) | **40%** |
| **visualStyle** | `hc:style=` | Parsers + visual hints | `directorIdentity` + shot hints | Completeness | Memory + canonical + `visualRules`; character prompt section via `buildCharacterIdentityPromptContext` | Truncated memory line | **65%** |
| **outfit** | `defaultClothing` | Memory mappers | Visual production lines | — | **Strong** — memory, continuity, execution rules | `buildCharacterRulesForExecution` | **80%** |
| **accessories** | `defaultAccessories` | Memory mappers | Visual production (`visualRules`) | — | Memory prompt; **not** in `buildCharacterIdentityPromptContext` | Execution rules | **55%** |

**Storage note:** Type/style/shape/energy/color live in `visualKeywords` tokens, not dedicated columns (`studio-character-identity-fields.ts`).

**Key consumers:** `studio-memory-prompt.ts`, `studio-character-identity-prompt-lines.ts`, `studio-prompt-builder.ts` (`sections.characters`, `sections.directorIdentity`, `sections.continuity`), `studio-scene-execution.ts`, `studio-director-proposal-builder.ts` (shot bias).

**Character aggregate impact score: 58%**

---

## Prop Impact

| Field | Stored | Read | Director | Planner | Prompt / generation | Motion | Score |
|-------|--------|------|----------|---------|---------------------|--------|-------|
| **linkedCharacterIds** | `appearanceMemory` `hc:chars=` | `studio-prop-identity-structured.ts` | One visual production line | — | Prop prompt + memory extras | **Not** used in placement/blocking | **30%** |
| **brandingRules** | `StudioProp.brandingRules` | Identity spec (`forbiddenElements`) | Haystack + visual lines | Completeness | Memory + prop prompt + execution rules | Compact memory line | **75%** |
| **reference bundles** | `continuityNotes` `[asset:refs]` + `referenceImageUrl` | `studio-asset-canonical-references.ts` | Completeness | Readiness | Primary → image provider; supporting → prompt text | Name-only in motion beyond memory truncation | **40%** |

Structured prop tokens (shape, color, material) follow the location pattern — consumed in prop prompt, memory, and `directorIdentity` (~60%).

**Prop aggregate impact score: 52%**

---

## Location Impact

| Field | Stored | Read | Director | Planner | Prompt / generation | Motion | Score |
|-------|--------|------|----------|---------|---------------------|--------|-------|
| **architecture** | `environmentKeywords` `hc:arch=` | `parseLocationStructuredKeywords` | Visual production lines | Asset evolution | Location prompt + memory + `directorIdentity` | Memory line (truncated) | **70%** |
| **materials** | `hc:material=` | Same | Same | — | Same | Same | **70%** |
| **lighting** | `hc:light=` | Same | Same | — | Same | Same | **70%** |
| **color palette** | `hc:color=` | Same | Same | — | Same | Same | **70%** |

Location `forbiddenElements` suffers the **same spec-mapper drop** as character (`locationToIdentitySpec` → `forbiddenElements: ""`).

**Location aggregate impact score: 68%**

---

## World Impact

| Field | Stored | Read | Director | Planner | Prompt / generation | Motion | Score |
|-------|--------|------|----------|---------|---------------------|--------|-------|
| **render strategies** | `continuityRules` `[render:strategies]` | `parseWorldRenderStrategies`, `buildWorldIdentityRenderStrategyHints` | — | **Render strategy planner** reasons (post-parity) | World memory lines | Not in Vidu job metadata directly | **60%** |
| **continuity rules** | `continuityRules` (usage/forbidden/brand/audio) | `parseWorldContinuitySections` | Haystack + visual/audio lines | Rule presence UI | Memory extras + execution world rules | Memory line | **75%** |
| **preferred shots** | `continuityRules` `[shots:]` | `resolveWorldIdentityShotHint` | **Shot bias** (world-first priority) | — | Visual production lines | Not passed to Vidu as shot list | **55%** |

World visual style / shape / color / lighting in structured `visualStyle` → visual production lines (~70%).

**Does world influence camera/cinematography/lighting/atmosphere?**
- **Yes (partial):** shot bias, visual/audio production lines, memory continuity, render strategy **reasons**
- **No (gaps):** Vidu execution instructions do not re-apply world shot preferences; animation planner uses scene-level `cameraMovement` / `sceneEnergy`, not world `[shots:]` block

**World aggregate impact score: 65%**

---

## Motion Consumption

### Chain

```
Handoff payload (characterMemory, worldMemory, locationMemory, propMemory)
  → studio-motion-handoff-map.ts (storyMemory)
  → buildStudioSceneMotionInstructions()
  → studioMotionInstructions.text (≤520 chars, Identity line ≤200 chars)
  → Motion wizard context

Parallel path:
  → studio-scene-execution.ts (buildCharacterRulesForExecution, etc.)
  → executionPrompt on scene row
```

### Status vs prior audit

| Item | Prior audit | Now |
|------|-------------|-----|
| Memory snapshots in handoff | "stored, not used in rendering" | **Used** in `buildStudioSceneMotionInstructions` via `storyMemory` |
| `motion-handoff-payload.ts` comment | Still says "not used in rendering yet" | **Stale** — comment not updated; data **is** wired |
| `motion-handoff-execution-consumption.ts` | Images/jobs only | **Unchanged** — zero identity field consumption |
| Vidu instructions | Scene stills + text beats | **Unchanged** — no full identity re-injection at Vidu layer |

### What still does not flow to motion render

- Archive canonical refs (any asset)
- Prop `linkedCharacterIds` → blocking/placement
- World render strategies → Vidu job metadata
- Full structured identity (truncated to ~200 chars inside 520-char budget)
- `identityConsumption.directorContextLines` at storyboard level (plan metadata only, not per-scene Vidu prompt)

**Motion memory consumption score: 65%** (wired but lossy)

---

## Director Consumption

| Source | Reaches prompts? | Reaches proposals/UI? |
|--------|------------------|----------------------|
| **Per-scene `buildSceneDirectorContextLines()`** | **Yes** → `sections.directorIdentity` in image + execution prompts (post-parity) | Scene prompt preview |
| **Storyboard `identityConsumption.directorContextLines`** | **No** — not injected into scene LLM/image prompts | Director proposal, production plan, animation plan, creative review |
| **Shot bias (`biasShotTypeFromIdentity`)** | Indirect — mutates `shotType` before apply | Director proposal scenes |
| **Voice identity** | TTS/mux path | Director proposal cast |
| **Story architecture `directorContextLines`** | AI director **idea** enrichment only | Creation assistant |

**Gap:** Two different `directorContextLines` concepts — per-scene lines **do** reach prompts; storyboard-aggregated lines (top 8 visual + 4 audio) remain **display/plan metadata**.

**Director consumption score: 62%**

---

## Planner Consumption

| Planner | Identity used | Ignored / dead |
|---------|---------------|----------------|
| **Render strategy** | `buildStoryboardIdentityConsumption`, `buildWorldIdentityRenderStrategyHints` → strategy reasons | Strategies not copied into Vidu execution instructions |
| **Production planner** | Merges identity + memory `directorContextLines` into plan | `enrichIdeaWithProductionPlan` uses duration/strategy only |
| **Animation planner** | `identityConsumption.directorContextLines` in plan metadata (fixed post-parity) | Does not drive shot construction from identity shot hints |
| **Shot planner** | — | **All** identity shot hints |
| **Vidu execution planner** | Operational context (`execution:mode`, job counts) | Identity spec fields |
| **Asset decisions** | id/name/mode | Structured identity from decisions |

**Planner consumption score: 48%**

---

## Canonical References

| Tier | Storage | Generation | Motion |
|------|---------|------------|--------|
| **Primary (character)** | `referenceImageUrl`, `primaryReferenceImageId` | Image provider reference asset + consistency text | Handoff stores URL; render uses scene still, not ref re-upload |
| **Supporting (character)** | `referenceNotes.supporting[]` | Prompt role hints + `generationSettings.referenceAssets` | Text only |
| **Archive (character)** | `referenceNotes.archive[]` | **Dead** | **Dead** |
| **Primary (prop/location)** | `referenceImageUrl` | Image provider + consistency | Same as character |
| **Supporting (prop/location)** | `[asset:refs]` in `continuityNotes` | Prompt text (`buildSupportingReferenceLines`) | **Dead** |
| **Archive (prop/location)** | `bundle.archive` | **Dead** | **Dead** |

**How many refs reach the prompt?** At most **1 primary image per entity** as pixels + **N supporting** as text role labels (not image conditioning in motion). Archive: **0**.

---

## Dead Metadata

Ranked by user-facing impact (fields users fill but output barely changes):

| # | Metadata | UI surfaces | Pipeline gap | Impact |
|---|----------|-------------|--------------|--------|
| 1 | **Character `forbiddenElements`** | Identity builder, form, readiness, overview | `characterToIdentitySpec` forces `""` | **High** |
| 2 | **Location `forbiddenElements`** | Same pattern | `locationToIdentitySpec` forces `""` | **High** |
| 3 | **Archive refs (all assets)** | Canonical overview panels | Never in prompt/motion | **Medium** |
| 4 | **Prop `linkedCharacterIds`** | Prop identity builder (6+ fields) | Visual line only; no motion blocking | **Medium** |
| 5 | **Character shape/color in visual production lines** | Identity builder | Only raw `visualKeywords` blob in `buildCharacterIdentityVisualProductionLines` | **Medium** |
| 6 | **Storyboard `directorContextLines`** | Director UI, plans | Not scene prompt injection | **Medium** (confusing dual meaning) |
| 7 | **World render strategies → Vidu** | World identity builder | Planner reasons only | **Medium** |
| 8 | **Voice `compatibilityScore`, accent, `voiceNotes`** | Voice Center (12+ touchpoints) | Selection UX only | **Low** (out of identity sprint scope) |
| 9 | **`sections.identity` world-only** | Prompt preview | Character/location/prop not in identity section by design | **Low** (contract confusion) |
| 10 | **Legacy `buildScenePromptFromSceneRowLegacy`** | — | No `sourceEntities` if called | **Low** (regression risk) |
| 11 | **Stale handoff comment** | Types only | Misleading "not used in rendering" on memory fields | **Docs debt** |

---

## Asset Impact Scores

Aggregate — share of filled metadata that reaches **at least one** of Director / Planner / Prompt / Motion:

| Asset | Score | Strongest paths | Weakest paths |
|-------|-------|-----------------|---------------|
| **Character** | **58%** | outfit, appearance memory, primary ref, voice | forbiddenElements, archive refs, shape in visual lines |
| **Prop** | **52%** | brandingRules, structured style tokens | linkedCharacterIds, supporting/archive refs in motion |
| **Location** | **68%** | architecture/materials/lighting/color in prompts | forbiddenElements, motion truncation |
| **World** | **65%** | continuity rules, visual style, memory | preferred shots → Vidu, render strategies → execution |

### Per-pipeline reach (any asset, averaged)

| Pipeline | Score | Notes |
|----------|-------|-------|
| **Prompt Builder / image gen** | **72%** | Best after parity sprint; archive + forbidden gaps remain |
| **Director (proposals)** | **62%** | Shot bias + per-scene lines; aggregated lines UI-only |
| **Planner** | **48%** | Metadata in plans; shot planner ignores identity |
| **Motion** | **65%** | Memory wired but truncated; execution consumption ignores identity |

---

## Over-Configuration

Fields with **high UI investment, low output effect**:

| Field | Approx. UI exposure | Prompt/motion reach | Verdict |
|-------|---------------------|---------------------|---------|
| **Character forbidden elements** | Identity builder, edit form, readiness, canonical panel | ~25% (notes leak only) | **Over-configured** |
| **Archive references** | Canonical overview, archive badges | 0% generation | **Over-configured** |
| **Prop linked characters** | Prop identity builder, character picker | 30% (one text line) | **Over-configured** |
| **Voice compatibility score** | Recommendations, persona cards, selection memory | 0% downstream | **Over-configured** (voice) |
| **Identity consumption trends** | Storyboard identity summary | 0% generation | **Display-only** (acceptable) |
| **World preferred shots block** | World identity builder (shots/camera/motion/pacing) | 55% (shot bias only) | **Partially over-configured** |

---

## Highest ROI Fixes

### Quick wins (no new architecture)

1. **Wire `forbiddenElements` in `characterToIdentitySpec` / `locationToIdentitySpec`** — parse `[identity:forbidden]` from continuity notes so visual production lines and `directorIdentity` include forbidden rules. *~1 file, high user trust.*

2. **Call `buildCharacterStructuredIdentityPromptLines` from `buildCharacterIdentityVisualProductionLines`** — shape/color/energy/style as labeled lines in director context, not raw blob. *Parity with memory path.*

3. **Add `defaultAccessories` to `buildCharacterIdentityPromptContext`** — one-line fix for character prompt section.

4. **Update stale `motion-handoff-payload.ts` comment** — memory fields are consumed; comment causes false audit conclusions.

### Medium impact

5. **Prop `linkedCharacterIds` → motion blocking hint** — when prop linked to character, add line in `buildStudioSceneMotionInstructions` / `SceneAssetPlacement`. *Uses existing placement V43.*

6. **Prioritize forbidden/brand lines in motion `packLines`** — reorder or raise budget slice for identity before generic safety lines.

7. **Inject `buildWorldIdentityRenderStrategyHints` into Vidu execution plan scene metadata** — connect planner reasons to execution instructions.

8. **Supporting refs in motion** — pass supporting URLs to execution package where provider allows (today image-gen only).

### High impact

9. **Shot planner reads `resolveSceneIdentityShotBias`** — identity shot hints currently stop at director proposal; animation/shot planners ignore them.

10. **Unify `directorContextLines` naming** — distinguish `sceneDirectorIdentityLines` (prompt) vs `storyboardIdentitySummaryLines` (UI/plans) to prevent regression.

11. **Archive refs → optional “style reference” text** — even without pixels, archived primary labels could inform continuity prompt (“maintain look from v1 chef reference”).

---

## Completion Plan (roadmap)

### Phase A — Quick wins (1 sprint)

- Forbidden elements in identity spec mappers
- Structured character tokens in visual production lines
- Accessories in character prompt context
- Stale motion handoff comments + audit doc sync

**Expected lift:** Character 58% → ~72%; Location 68% → ~78%

### Phase B — Motion & planner bridge (1 sprint)

- Motion identity budget / prioritization
- Prop linkedCharacterIds → placement/blocking
- World render strategies in Vidu execution metadata
- Shot planner identity shot bias

**Expected lift:** Motion 65% → ~78%; Planner 48% → ~62%

### Phase C — Reference depth (1 sprint)

- Archive ref labels in continuity text (no schema change)
- Supporting ref parity in motion where provider supports
- Clarify `sections.identity` contract (world + optional entity rollup)

**Expected lift:** Canonical refs 40% → ~60%

---

## Wat NIET opnieuw gebouwd moet worden

- **Identity Spec Engine** — works; gaps are mapper/prompt wiring, not engine design
- **Memory Prompt Builders** — primary generation path; extend, don't replace
- **Production Prompt Pipeline** — parity fixed; extend `sourceEntities` usage
- **Voice Marketplace / TTS** — separate consumption domain; out of scope
- **New Studio v2** — not required
- **Schema migrations** — forbidden elements and tokens already fit in `continuityNotes` / `visualKeywords`
- **Parallel identity architecture** — `studio-identity-consumption.ts` is the correct read layer

---

## Tests / references

| Doc / module | Role |
|--------------|------|
| `docs/studio-consumption-reality-audit.md` | Pre-parity baseline |
| `docs/production-prompt-parity-report.md` | Parity fixes applied |
| `docs/studio-identity-consumption-consolidation-report.md` | Prompt consolidation |
| `src/lib/studio-identity-consumption.ts` | Consumption aggregation |
| `src/lib/studio-prompt-parity.ts` | Preview vs production diff |
| `src/lib/studio-prompt-source-entities.ts` | Per-scene director lines |
| `src/lib/build-studio-scene-motion-instructions.ts` | Motion identity line |
| `src/lib/studio-identity-spec-mappers.ts` | Forbidden-elements drop location |

**Validation:** Audit-only — no build/test run required for this deliverable.
