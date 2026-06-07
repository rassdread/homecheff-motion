# Action To Shot Distribution Report

## Reality Audit

See [studio-action-shot-distribution-reality-audit.md](./studio-action-shot-distribution-reality-audit.md).

Render Strategy had raw fragment splits; Shot Planner had capability hints — but no unified beat roles or duration advice on the full action plan.

## Welke bestaande systemen zijn hergebruikt

- `extractActionSteps()` / `matchActionFragmentToCapability()` — action chain input
- `buildCharacterCapabilities()` — optional character context + missing asset hints
- `sceneHasCompletedImage()` — image status on beats
- `buildStudioRenderStrategyPlan()` — extended, not replaced
- `buildSceneImageReadiness()` — action sequence checks added
- `buildDirectorProposal()` — distribution preview on proposals

## Hoe action chains worden gedetecteerd

**`buildSceneActionChain()`** — sequential splits first, then verb extraction; maps fragments to semantic step IDs (`juggle`, `shoot`, `cook`, …); sports context auto-adds `ball_control` when needed; outputs complexity, recommended shot count, missing props/locations.

## Hoe shot beats worden verdeeld

**`buildActionShotDistribution()`** — maps each chain step to beats with roles:

| Role | Example |
|------|---------|
| opening | Mascot enters field |
| setup | Foot on ball |
| action | Juggle, shoot |
| payoff | Celebrate |
| closing | Run away |

Each beat includes image role (start_pose / action_pose / payoff_pose / end_pose) and status.

## Hoe duration advice werkt

**`buildDurationAdvice()`** — ~4–6s per step; compares scene `durationSeconds` to recommended min/max; levels: `too_short` | `good` | `too_long`. Advice only — no automatic duration changes.

## Hoe Visual Production aansluit

- `buildSceneImageReadiness()` adds action sequence + duration mismatch checks
- `StudioActionSequenceSummary` on Visual Production panel

## Hoe Render Strategy aansluit

- `buildShotSplitSuggestions()` now uses distribution beats (label keys + hints)
- `actionShotDistributions` on `StudioRenderStrategyPlan`
- Duration mismatch warnings when action plan exceeds scene time

## Hoe AI Director aansluit

- `actionShotDistribution` on `StudioDirectorProposal`
- Preview UI with “Use shot suggestion” / “Keep as is” (preview only, no schema writes)

## Hoe Consistency aansluit

- `buildStudioUnifiedReadiness()` — warnings for multiple shots + duration mismatch
- `StudioActionSequenceSummary` on Consistency panel

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-action-shot-distribution.ts` | New types |
| `src/lib/studio-action-shot-distribution.ts` | Core chain + distribution + duration |
| `src/lib/studio-render-strategy-planner.ts` | Distribution-driven splits |
| `src/types/studio-render-strategy.ts` | `actionShotDistributions` |
| `src/lib/studio-visual-production-summary.ts` | Readiness checks |
| `src/lib/studio-unified-readiness.ts` | Warnings |
| `src/lib/studio-director-proposal-builder.ts` | Proposal distribution |
| `src/types/studio-director-proposal.ts` | Proposal types |
| `src/components/studio/studio-action-sequence-summary.tsx` | UI |
| Director / Visual / Consistency panels | Wired UI |
| `studio-director-proposal-flow.tsx` | Proposal preview |
| `src/i18n/locales/en.ts`, `nl.ts` | Full parity |
| `src/lib/studio-action-shot-distribution-foundation.test.ts` | 11 tests |

## Wat bewust niet gebouwd is

- Animation planner
- Vidu execution
- Timeline editor
- Automatic scene splitting or duration writes
- Schema migrations
- Image generation triggers

## Wat de volgende sprint moet zijn

1. **Animation planner** — map distribution beats to motion keyframes
2. **Apply shot suggestion** — safe scene split via existing scene API when user confirms
3. **Start/end frame linking** — tie image requirements to beat-level asset slots

## Tests/build status

| Check | Status |
|-------|--------|
| prisma validate | ✅ |
| build | ✅ |
| tests | **1673/1673** pass (+11 new) |
