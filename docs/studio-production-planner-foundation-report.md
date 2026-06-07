# Production Planner Foundation Report

## Reality Audit

See full audit: [`docs/studio-production-planner-reality-audit.md`](./studio-production-planner-reality-audit.md).

**Summary:** All required subsystems already existed (Identity, Capabilities, Action Distribution, Render Strategy, Visual Production, Shot Planner, Consistency, Continuity, Project Memory, Unified Readiness, AI Director). The gap was a **project-level orchestrator** that reads them together and speaks in production terms (“35 s video, 8 shots, 3 gaps”) instead of per-scene fragments.

## Welke systemen zijn samengebracht

| Systeem | Gebruik in Production Planner |
|---------|-------------------------------|
| `buildStudioUnifiedReadiness` | Overall readiness score, fixes, render strategy plan |
| `buildStoryboardAssetEvolution` | Asset planning (present / missing / recommended) |
| `buildStoryboardIdentityConsumption` | Dominant world + identity completeness |
| `buildStoryboardActionShotDistribution` | Action planning (steps, recommended shots, splits) |
| `buildCurrentStoryboardShotPlan` | Shot count estimate |
| `buildVisualProductionSummary` | Image readiness per scene |
| `buildSceneImageReadiness` | Scene-level image signals (via unified path) |
| `detectArcPhaseForIndex` | Story structure phase mapping |
| `buildDirectorProposal` | AI Director receives enriched idea + plan on proposal |

**Niet samengebracht (bewust):** Animation Planner, Vidu Execution, Timeline Editor, new providers, schema migrations, render engine.

## Hoe Production Planner werkt

`buildStudioProductionPlan(input)` in `src/lib/studio-production-planner.ts`:

**Input:** storyboard, scenes, asset libraries (characters, locations, props, worlds), optional project memory, style/director profiles.

**Output:** `StudioProductionPlan` with:

- `productionGoalKey` + params (duration, shots, scenes, missing count)
- Estimates: duration, shots, scenes, assets
- `readiness` / `readinessScore` from unified readiness (no new score engine)
- `missingItems`, `recommendations`, `creationGuidance`
- Domain sections: story structure, assets, actions, images, audio, render
- `directorContextLines` for AI Director

Planning only — no generation, rendering, or auto-create.

## Hoe story planning werkt

Scenes are mapped to five narrative phases via existing story arc detection:

| Phase | Arc phases |
|-------|------------|
| intro | opening |
| setup | discovery |
| development | build_up, transition |
| climax | climax |
| ending | resolution, outro |

Each phase gets status: **present** (1 scene), **strong** (2+), **weak** (story exists but phase empty), **missing**. Informational only — no blockers.

## Hoe asset planning werkt

Uses **Asset Evolution** + **Identity Consumption** + **Project Memory**:

- Per kind: characters, locations, props, worlds
- Status: present ✓, missing ⚠, recommended
- Missing items feed **Creation Guidance** with `toolId` for “Open library” / “Create new” — no auto-create

## Hoe action planning werkt

Uses **Action To Shot Distribution**:

- `totalActionSteps` — actions extracted across scenes
- `recommendedShotCount` — shots advised from action chains
- `complexity` from render strategy
- `scenesWithActionChain`, `durationMismatchScenes` for split advice

Example output: “5 actions → 8 recommended shots”.

## Hoe image planning werkt

Uses **Render Strategy Planner** image requirements + **Visual Production Summary**:

- `requiredCount`, `presentCount`, `missingCount`, `recommendedCount`
- Missing images appear in `missingItems` with link to Visual tool
- No image generation triggered

## Hoe audio planning werkt

Reads storyboard flags and content:

| Track | Source | Status |
|-------|--------|--------|
| Narration | `voiceEnabled` + script | ready / partial / missing |
| Transcript | scene description/action | ready / partial / missing |
| Music | `musicEnabled` + style | ready / partial / missing |
| Sound | `soundEnabled` + style | ready / partial / missing |

No audio generation triggered.

## Hoe render planning werkt

Uses **Render Strategy Planner** (via unified readiness):

- Shows recommended strategy: story video / action sequence / hybrid
- Strategy label + explanation keys (i18n)
- Reason keys and confidence
- No rendering triggered

## Hoe AI Director wordt aangestuurd

Production Planner sits **above** AI Director:

1. `buildStudioProductionPlan()` runs first (in proposal flow and production tab).
2. `enrichIdeaWithProductionPlan(idea, plan)` prepends production context to the user idea.
3. `buildDirectorProposal()` accepts optional `productionPlan`; builds one if omitted.
4. Enriched idea flows into existing `interpretAiDirectorPrompt()` and `buildAiDirectorDirection()`.
5. Proposal includes `productionPlan` on `StudioDirectorProposal`.

Example context line: `[production: 35s, 8 shots, 4 scenes] [render: hybrid] [actions: 5 steps, 8 recommended shots] [gaps: 3 items still needed]`.

No new AI — same proposal flow, richer input.

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-production-plan.ts` | **New** — plan types |
| `src/lib/studio-production-planner.ts` | **New** — `buildStudioProductionPlan`, enrich helpers |
| `src/lib/studio-production-planner-foundation.test.ts` | **New** — 11 foundation tests |
| `src/components/studio/studio-workspace-production-plan-panel.tsx` | **New** — Production plan UI tab |
| `src/lib/studio-tool-id.ts` | Added `"production"` before `"story"` |
| `src/components/studio/studio-tool-strip.tsx` | Production tab label |
| `src/components/studio/studio-tool-placeholder-panel.tsx` | Production placeholder |
| `src/components/studio/studio-workspace-shell.tsx` | Renders production panel |
| `src/lib/studio-director-proposal-builder.ts` | Production plan → director input |
| `src/types/studio-director-proposal.ts` | `productionPlan?` on proposal |
| `src/components/studio/studio-director-proposal-flow.tsx` | Builds plan before proposal |
| `src/i18n/locales/en.ts` | `studio.tools.production` + `studio.productionPlan.*` |
| `src/i18n/locales/nl.ts` | Productieplan NL parity |
| `docs/studio-production-planner-reality-audit.md` | **New** — reality audit |
| `package.json` | Test script includes foundation test file |

## Wat bewust niet gebouwd is

- Animation Planner
- Vidu Execution Planner
- Timeline Editor
- New AI providers or models
- Schema / Prisma migrations
- New render engine or execution pipeline
- Auto-create assets (library / create buttons only)
- Hard blockers on incomplete productions
- New scoring engine (reuses unified readiness)

## Wat de volgende sprint moet zijn

1. **Animation Planner** — translate production plan + shot beats into animation timing (after production thinking is validated in UX).
2. **Vidu Execution Planner** — map render strategy + shots to provider jobs (still no new provider).
3. **Timeline Editor** — visual timeline from production plan estimates vs actual scene durations.
4. **Production plan in Director preview UI** — optional visible summary before accepting proposal.
5. **Deep continuity hooks** — surface continuity warnings in production missing items (data exists, not wired yet).

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ Pass |
| `npx prisma generate` | ✅ Pass |
| `npm run lint` | ✅ 0 errors (153 pre-existing warnings) |
| `npm run build` | ✅ Pass |
| `npm run test` | ✅ **1684/1684** pass (includes 11 production planner foundation tests) |

Foundation tests cover: story structure, asset planning, action planning, image planning, audio planning, render planning, AI director input enrichment, director proposal integration, missing shot recommendations, domain readiness, i18n key usage via plan structure.
