# Studio Orchestration Sprint — Production Readiness Report

**Date:** 2026-06-24  
**Sprint:** Studio Orchestration (Phases 1–16)

## Scorecard (post-sprint)

| System | Before | After | Target |
|--------|--------|-------|--------|
| Studio Director | 6/10 | 7/10 | 9/10 |
| Motion Integration | 8/10 | 8/10 | 9/10 |
| Publish | 5/10 | 6/10 | 9/10 |
| Asset Reuse | 5/10 | 6/10 | 9/10 |
| Music Video | 1/10 | 5/10 | 9/10 |
| Character To Film | 5/10 | 6/10 | 9/10 |
| Long Form Video | 2/10 | 6/10 | 9/10 |
| Copilot | 4/10 | 7/10 | 9/10 |
| **Overall Production Suite** | **4/10** | **6/10** | **9/10** |

## What was implemented

### Phase 1–2: Single entry + Video Intent Engine
- `/studio/start` is the primary production entry with `StudioProductionOrchestratorPanel`
- 15 canonical video intents in `studio-video-intents.ts`
- Copilot routes directly to `/studio/start?intent=…` — no clarification loops for genre prompts
- User-facing phases: Collect → Analyze → Plan → Create → Finish

### Phase 3–4: Music video + long-form duration
- `AudioAnalysisProfile` + heuristic structure (intro/verse/chorus/bridge/finale)
- `MusicVideoProductionPlan` with scene/render/credit estimates
- Long-form targets: 3 min, 5 min, 10 min in `studio-long-form-duration.ts`
- Director brief extended in `studio-v11-director-suggestions.ts`

### Phase 5: Character to film
- `studio-character-film-bridge.ts` — auto-attach character to HC project on create

### Phase 6–8: Director + render planning
- Orchestrator wires HC Workflow V2 orchestrator state
- `studio-render-batch-planner.ts` — batch splits for long projects
- Auto motion import via `?autoImport=1` on handoff page

### Phase 9: Motion consumption
- Extended `MotionExecutionConsumption` with `directorMetadata` (music, voice, camera, continuity)

### Phase 10–11: Publish final cut + video import
- `publish-audio-export-mux.ts` wired into export pipeline (local audio paths)
- Video upload intake in orchestrator panel for edit workflows

### Phase 12: Unified asset picker
- Existing `HomeCheffAssetPickerModal` reused across Studio/Motion/Publish (no parallel system)

### Phase 13–14: Orchestrator dashboard + vocabulary
- `StudioProductionOrchestratorPanel` with status stepper
- Suite flow labels: "Create video" / "Finish video" (not Motion/Publish)

### Phase 16: Analysis cost engine
- `StudioAnalysisPlan` with upfront credits per workflow
- API: `POST /api/studio/orchestrator/plan`, `POST /api/studio/orchestrator/reserve`
- Cache reuse via `motion-analysis-cache` integration

## Remaining gaps

| Gap | Priority |
|-----|----------|
| Server-side audio analysis (ffprobe) — still heuristic | P0 |
| Full auto storyboard creation without brief wizard click-through | P0 |
| Publish audio mux for remote/blob URLs | P1 |
| Auto-start Motion render after handoff (no wizard confirm) | P1 |
| Unified asset storage model (7 silos remain) | P1 |
| Director V2 default on + deprecate parallel editors | P2 |
| LLM intent classification | P2 |

## Launch blockers

1. End-to-end music video without manual storyboard wizard steps
2. Credit reservation must call `authorizeStudioAction` before generation batch (reserve API is preview-only today)
3. Publish remote audio URL fetch before mux

## Recommended next sprint

1. **Auto-bootstrap storyboard** from orchestrator approve → `createStoryboardFromProductionBrief` without redirect to manual wizard
2. **ffprobe audio analysis** API route for accurate duration/sections
3. **Auto-render queue** after handoff import
4. **Publish blob audio** download + mux in export service
