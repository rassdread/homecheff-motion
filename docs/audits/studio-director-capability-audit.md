# Studio Director Capability Audit (S.6F)

**Date:** 2026-08-09  
**Mode:** Read-only  
**Branch:** `main` @ `15440be3` (docs tip; product code from S.6E merge)

---

## A. Profile / language Directors

| Name | Paths | Decisions | Writes | Status |
|------|-------|-----------|--------|--------|
| Director profiles (6) | `studio-director-profiles.ts` | commercial/documentary/cinematic/social_media/storytelling/educational | Storyboard `directorProfile` → prompt phrases | **LIVE** |
| Prompt style profiles (6) | `studio-prompt-style-profiles.ts` | visual style pack | Storyboard `promptStyleProfile` | **LIVE** |
| Scene director (shot/move/energy) | `studio-scene-director.ts` | 11 shots, 11 moves, 4 energies | Scene fields → Matrix/builder | **LIVE** |
| Legacy camera builder | `studio-prompt-camera-builder.ts` | fallback camera phrases | Prompt only | **LEGACY** |

---

## B. Planning / proposal Directors

| Name | Paths | Decisions | Writes | Status |
|------|-------|-----------|--------|--------|
| Auto Shot Planner | `studio-auto-shot-planner.ts` | Arc-phase → shot/move/energy | Proposal → apply | **LIVE** |
| Shot planner | `studio-shot-planner.ts` | Shot planning foundation | Plan objects | **LIVE/PARTIAL** |
| Story arc / flow / energy curve | `studio-story-arc.ts`, `studio-story-flow-analyzer.ts`, `studio-energy-curve.ts` | Narrative pacing | Feeds auto-shot | **LIVE** |
| Director proposal builder | `studio-director-proposal-builder.ts` | Aggregated proposal | Proposal DTO | **LIVE** |
| Director proposal apply | `studio-director-proposal-apply.ts` | Persist proposal to scenes/SB | DB fields | **LIVE** |
| Proposal readiness / decision memory | `studio-director-proposal-readiness.ts`, related | Gate apply | Metadata | **LIVE/PARTIAL** |
| AI Director interpreter | `studio-ai-director-interpreter.ts` | Free text → profile/tags | Interpreted plan | **PARTIAL** |
| AI Director direction | `studio-ai-director-direction.ts` | Direction helpers | Plan | **PARTIAL** |
| V11 Director wizard | `studio-v11-director-wizard.ts` + questions/suggestions/confidence | Guided Q→defaults | Prefills | **PARTIAL** |
| Movie director quality | `studio-movie-director-quality.ts` | Quality report over plan | Report only | **ADVANCED** |

---

## C. Domain Directors (audio / visual / performance)

| Name | Paths | Decisions | Writes | Status |
|------|-------|-----------|--------|--------|
| Music Director | `studio-music-director.ts` | Style/intensity/role | Storyboard music fields / plans | **LIVE** planning |
| Sound Director | `studio-sound-director.ts` | Ambience/SFX density | Sound fields / plans | **LIVE** planning |
| Voice Director | `studio-voice-director.ts` | Narration plan | SB voice fields | **LIVE** planning |
| Voice Identity Director | `studio-voice-identity-director.ts` | Character voice resolve | Handoff / identity | **LIVE** |
| Audio Production Director | `studio-audio-production-director.ts` | Mix priority/style | Audio production fields | **LIVE** planning |
| Audio Asset Director | `studio-audio-asset-director.ts` | Asset selection plan | Asset refs | **LIVE/PARTIAL** |
| Media Asset Director | `studio-media-asset-director.ts` | Media asset decisions | Plans | **PARTIAL** |
| Scene Composition Director | `studio-scene-composition-director.ts` | Framing/composition | Prompt/plan | **LIVE/PARTIAL** |
| Character Blocking Director | `studio-character-blocking-director.ts` | Staging/blocking | Plan/prompt | **PARTIAL** |
| Attention Director | `studio-attention-director.ts` | Focus hierarchy | Plan | **PARTIAL** |
| Asset Placement Director | `studio-asset-placement-director.ts` | Placement | Plan | **PARTIAL** |

---

## D. Production / render / provider planning

| Name | Paths | Decisions | Writes | Status |
|------|-------|-----------|--------|--------|
| Production Planner | `studio-production-planner.ts` | Production sequence | Plan | **ADVANCED** |
| Production Center | `studio-production-center.ts` + UI | Checklist / readiness | Report | **ADVANCED** |
| Animation Planner | `studio-animation-planner.ts` | Scene→animation shots | Plan → Motion | **LIVE** |
| Vidu Execution Planner | `studio-vidu-execution-planner.ts` | Segment execution | Plan | **LIVE** |
| Render strategy / batch planners | `studio-render-strategy-planner.ts`, `studio-render-batch-planner.ts` | Batch/render strategy | Plan | **ADVANCED** |
| Scene image planner | `studio-scene-image-planner.ts` | Still generation plan | Plan | **LIVE/PARTIAL** |
| Analysis planner | `studio-analysis-planner.ts` | Consistency/vision scheduling | Plan | **PARTIAL** |
| Provider assignment | `studio-provider-assignment.ts` | Planned provider picks | Plan (may ≠ runtime) | **PARTIAL** |
| Provider execution director | `studio-provider-execution-director.ts` | Execution routing plan | Plan | **PARTIAL** |
| Long-form duration | `studio-long-form-duration.ts` | Target length → scene counts | Plan defaults | **PARTIAL** |

---

## E. UI / assistant surfaces

| Name | Paths | Role | Status |
|------|-------|------|--------|
| Director V2 panel | `components/studio/director-v2/**` | Canonical advanced director UI in workspace | **LIVE** (flag `NEXT_PUBLIC_STUDIO_DIRECTOR_V2`, default on) |
| Classic AI Director panel | `studio-ai-director-*` components | Legacy composer surface | **LEGACY** |
| AI Director compare modal | `studio-ai-director-compare-modal.tsx` | Diff proposals | **LIVE** |
| Director preferences tool | workspace tool panel | Persist preferences | **LIVE** |
| Creation Assistant | `studio-creation-assistant.ts` | Guided creation view | **LIVE** |
| Homecheff / Growth assistants | `assistant-*`, `homecheff-assistant-*` | Intent → route/action fan | **LIVE** entry |
| Story intelligence panel | `studio-story-intelligence-panel.tsx` | Arc/plan insight | **LIVE/PARTIAL** |
| Creative review panel | `studio-creative-review*.ts(x)` | Pre-render review | **ADVANCED** |
| Movie Builder | `…/movie-builder`, `studio-movie-builder-*` | Multi-step movie flow | **ADVANCED** |

---

## F. Feature flags

| Flag | Default | Effect |
|------|---------|--------|
| `NEXT_PUBLIC_STUDIO_DIRECTOR_V2` | ON unless `"false"`/`0` | Classic composer V2 vs legacy; workspace story tool often mounts V2 regardless |
| `NEXT_PUBLIC_STUDIO_AI_ASSISTANT` | ON | AI Production Assistant / insights rail |
| `NEXT_PUBLIC_HOMECHEFF_ASSISTANT` | ON | Global assistant dock |
| `NEXT_PUBLIC_HOMECHEFF_ASSISTANT_AI_INTERPRETATION` | ON | Assistant interpret AI vs rules-only |
| `NEXT_PUBLIC_PRODUCTION_MODE` | ON | Simplifies Motion/Studio UI with advanced toggle |
| localStorage `hc-studio-advanced-features` | off unless toggled | Gates Movie Builder / Production Center links |

---

## G. Write behavior (critical for orchestrator design)

| Behavior | Systems |
|----------|---------|
| **Writes scene/storyboard creative fields** | Scene Director fields; AI Director / Shot Planner apply; Director Proposal apply; Music/Sound/Voice/Audio Production panels; brief create; Director V2 save |
| **Writes prompts via builder/Matrix** | Director profile + shot/energy → `studio-prompt-builder` / S.6E Matrix wrap |
| **Handoff / propose only** | Composition, Placement, Blocking, Attention, Provider execution, Animation, Render Strategy, Vidu Execution, Scene Generation Orchestrator, Story Intelligence, Creative Review, Creation Assistant |
| **No dedicated modules found** | Lighting planner, mood planner, style planner, camera planner (beyond Scene Director), performance planner (performance lives in `studio-character-performance` for Motion) |

Lighting today is mostly **identity/prompt text** (location/world), not a Director.

---

## H. Adjacent planners / wizards (full swarm ~40 systems)

Also inventoried (see deep inventory): Production Brief + V10/V11 wizard · Story Architect · Story Intelligence · Scene Image Planner · Action→Shot Distribution · Animation / Render / Vidu / Scene Generation Orchestrators · Production Center · Movie Builder · HC Production Orchestrator · Creative Review · Insights Hub · HomeCheff Assistant interpret/execute · Editor Instruction AI Director (Editor canvas, not Studio storyboard).

---

## I. Capability gap vs “one Creative Director”

| Needed for S.6F orchestrator | Exists? |
|-----------------------------|---------|
| Domain planners | **Yes** (many; ~40 planning systems) |
| Proposal apply pipeline | **Yes** |
| Mode policy (Quick/Pro/Director) | **Partial** (Matrix `detailLevel` only; no product mode controller) |
| Single orchestration entry | **No** — swarm of directors |
| Continuity-safe proposals | **Partial** — proposals touch creative fields; identity owned elsewhere |
| Provider-neutral intent | **Mostly** — except provider assignment/execution directors |
| Lighting as first-class auto decision | **No dedicated planner** |

**Conclusion:** Capabilities are sufficient to **orchestrate**, not to replace.
