# Vidu Render Strategy Planner Report

## Welke render modes bestaan al

Zie [Render Strategy Reality Audit](./studio-render-strategy-reality-audit.md).

Studio adviseert user-facing:
- **Verhaalvideo** → `instantMode: story` → Vidu multiframe
- **Actiereeks** → `instantMode: transition` → Vidu start-end2video
- **Hybride render** → per-scene mix

Geen provider-termen in UI.

## Welke data is gebruikt

- `StudioStoryboardDetail` scenes (action, description, duration, images)
- `buildCurrentStoryboardShotPlan()` — diversity, beats
- `buildStoryboardIdentityConsumption()` — world identity
- `parseWorldRenderStrategies()` — world `hc:render=` hints
- `resolveInstantPremiumOutputPlan()` — provider duration estimate

## Hoe strategy classifier werkt

`buildStudioRenderStrategyPlan()` in `src/lib/studio-render-strategy-planner.ts`:

1. Score story / action_chain / hybrid from scene count, action complexity, world hints, shot diversity
2. Pick highest score with hybrid tie-break
3. Output confidence, reasons (i18n keys), internal `instantMode` mapping

## Hoe action complexity werkt

Per scene: parse action text for sequential steps and action verbs (NL+EN). Levels:
- **low** — 0–1 steps
- **medium** — 2 steps
- **high** — 3+ steps or multi-verb sequences

High complexity boosts action_chain / hybrid.

## Hoe shot splitting advice werkt

High-complexity scenes get `suggestedShotSplitting` with labeled shots from parsed action steps. **Preview only** — no auto scene split (would need schema/scene mutations).

## Hoe image requirements werken

- **Story:** scene still per scene
- **Action chain:** start frame (required) + end frame (recommended)
- **Hybrid:** per-scene assignment from `sceneAssignments`

Status: present / missing / recommended.

## Hoe duration/speed advice werkt

Uses `resolveInstantPremiumOutputPlan` for `estimatedProviderDurationSeconds`. Compares to scene duration sum or `desiredFinalDurationSeconds`. When provider > final × 1.05 → `suggestedSpeedAdjustment` (advice-only; `speedAdviceOnly: true` — no FFmpeg speed renderer).

## Hoe AI Director aansluit

`buildDirectorProposal()` attaches `renderStrategyPlan` to proposal preview.

## Hoe Visual Production aansluit

`StudioRenderStrategySummary` in visual tab shows missing images for recommended approach.

## Hoe Consistency aansluit

Unified readiness includes `renderStrategyPlan` + warnings for missing images / split advice. Consistency tab shows full strategy summary.

## Hoe handoff metadata werkt

`createMotionHandoffPayload()` attaches `renderStrategyPlan` (V47). Motion may ignore until P1; existing wizard mode toggle remains fallback.

## Welke bestanden zijn aangepast

**Nieuw:**
- `src/types/studio-render-strategy.ts`
- `src/lib/studio-render-strategy-planner.ts`
- `src/lib/studio-render-strategy-handoff.ts`
- `src/lib/studio-render-strategy-foundation.test.ts`
- `src/components/studio/studio-render-strategy-summary.tsx`
- `docs/studio-render-strategy-reality-audit.md`
- `docs/studio-vidu-render-strategy-planner-report.md`

**Gewijzigd:**
- `src/types/motion-handoff-payload.ts`
- `src/types/studio-director-proposal.ts`
- `src/lib/studio-unified-readiness.ts`
- `src/lib/studio-director-proposal-builder.ts`
- `src/server/studio/create-motion-handoff-payload.ts`
- `src/components/studio/studio-workspace-production-panels.tsx`
- `src/components/studio/studio-workspace-consistency-panel.tsx`
- `src/components/studio/studio-workspace-visual-production-panel.tsx`
- `src/components/studio/studio-director-proposal-flow.tsx`
- `src/i18n/locales/en.ts`, `nl.ts`
- `package.json`

## Wat bewust niet gebouwd is

- Geen nieuwe video provider, render engine, MP4 import, timeline editor
- Geen schema migraties
- Geen auto-render, auto image generation, auto scene split
- Geen FFmpeg speed renderer
- Geen Motion-side consumer (P1)

## Wat P1/P2 blijft

**P1:** Motion reads `renderStrategyPlan.internalInstantMode` to pre-select wizard mode  
**P2:** Apply shot split suggestions via scene duplication API  
**P2:** FFmpeg speed adjustment when safe helper exists  
**P2:** Per-scene end-frame image generation hints in visual production

## Tests/build status

Run validation after merge — see CI output for `studio-render-strategy-foundation.test.ts`.
