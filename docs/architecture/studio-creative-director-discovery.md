# Studio Creative Director Discovery (S.6A)

**Phase:** S.6A — discovery only. No Director Mode implementation.

## Executive finding

Studio already has a **large rule-based “director stack”** that auto-decides profiles, shots, music/sound/mix, providers, duration, and aspect ratio. It does **not** yet have product modes named Quick / Professional / Director Mode as a unified UX. Almost no director planning path uses an LLM (assistant interpret and vision are separate).

## Existing automatic decisions

| Decision | Function / location | User click required? | Engine |
|----------|---------------------|----------------------|--------|
| Director profile from brief text | `interpretAiDirectorPrompt` | Brief only | Rule / regex presets |
| Video intent | `detectStudioVideoIntent` | Implicit from text | Rule |
| Default duration from intent | `studioVideoIntentDefaultDuration` | If omitted | Rule |
| Duration from brief length chips | `briefSelectionsToDurationSeconds` | Length chip | Rule (mappings disagree across systems) |
| Long-form acts / scene counts | `buildLongFormProductionPlan` | Target length | Rule |
| Auto shot / movement / energy | `buildAutoShotPlan` / `planForArcPhase` | Empty story / proposal | Rule |
| Story purpose → camera/emotion | `storyPurposePatch` | When V2 purpose applied | Rule |
| Director proposal scenes | `buildDirectorProposal` | Apply proposal | Rule (default ~6s scenes) |
| Music / sound / audio mix plans | `*-music/sound/audio-production-director` | From director profile | Rule |
| Provider selection (plan) | `resolveProviderAssignment` | quality/cost profiles | Rule; defaults standard/balanced |
| Aspect ratio | Motion handoff / batch render | **None** | Hardcoded `9:16` |
| Quality / negative-ish lines | `QUALITY_INSTRUCTIONS` | **None** | Hardcoded |
| Continuity / identity strength defaults | memory libs | If unset | Default `strong` |
| Improve auto-select | `autoSelectImprovedImage` | Flag toggle | Score heuristic |
| Visual focus kind | `buildSceneCompositionForScene` | Display | Rule |

## Director subsystems (name collision)

Studio uses “Director” for many planners:

- AI Director interpreter (NL → profiles)  
- Director V2 UI (camera/purpose cards)  
- Music / Sound / Audio Production / Media Asset / Provider Execution Directors  
- Scene composition / character blocking / attention directors  
- Movie / production quality directors  

These are **planning modules**, not a single Creative Director product mode.

## What already exists vs S.6 Creative Director vision

| Vision item | Today |
|-------------|--------|
| Automatic aspect ratio | **Yes** (forced 9:16) — no picker |
| Automatic duration | **Yes** (multiple conflicting maps) |
| Automatic movement / camera | **Yes** (auto shot planner) |
| Automatic lighting | **Partial** — location/world lighting enums; not a global lighting director |
| Automatic provider selection | **Plan yes / runtime partial** |
| Automatic quality | **Plan profiles** + hardcoded prompt quality line |
| Automatic negative prompt | **Partial** (Vidu/Motion/Editor; not Studio builder field) |
| Automatic enhancement | Improve jobs + correction patches + identity locks |
| Prompt Matrix optimization | **No** |
| Quick / Professional / Director modes | **No** unified modes |

## Mode readiness (without architecture rewrite)

| Mode | Feasible on current stack? | Gaps |
|------|----------------------------|------|
| **Quick Mode** | **PARTIAL** — intent + auto shot + defaults exist | Need single entry that suppresses advanced picks; unify duration; expose one CTA |
| **Professional Mode** | **PARTIAL** — most options already exist in UI | Need option matrix consistency; wire presets; reduce duplicate enums |
| **Director Mode** | **PARTIAL** — proposal + auto planners exist | Need explicit mode contract; LLM optional later; wire Prompt Matrix decisions |

**Architectural blockers for modes:** none that require rewriting GenerationJob, credits, or S.2 workspace. Gaps are product contracts + prompt composition wiring.

## LLM vs rules

| Path | LLM? |
|------|------|
| AI Director interpret | No |
| Shot / music / provider plans | No |
| Scene image / fusion / vision / assistant | Yes (providers) |

S.6 Creative Director can start as **rule orchestration over existing planners**, then optionally add LLM for brief→matrix later — without deleting rule directors.

## Recommended mode mapping (discovery recommendation only)

| Mode | Should use |
|------|------------|
| Quick | Intent → auto shot → default style/director → generate |
| Professional | Full option matrix + presets + manual camera/style |
| Director | Proposal apply + arc planner + continuous replan + future Matrix |

Do **not** implement in S.6A.
