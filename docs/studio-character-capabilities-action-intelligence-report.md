# Character Capabilities & Action Intelligence Report

## Reality Audit

See [studio-character-capabilities-reality-audit.md](./studio-character-capabilities-reality-audit.md).

Three parallel action vocabularies (scene presets, V44 blocking enum, render strategy verbs) are unified via `studio-scene-action-extraction.ts`.

## Capability model

**`buildCharacterCapabilities()`** derives actions from:

- Outfit/clothing keywords (chef → cook, taste, serve)
- Accessories (spoon, basket, ball)
- Character role/type and personality
- Linked world type (`food_universe`, `sports_universe`, …)
- Scene prop `hc:func` (cooking, sports, harvest)

Output tiers: **expected**, **supported**, **possible** — recommend only, no blocks.

## Action classification

**`classifySceneActions()`** per scene + character plan:

| Level | Meaning |
|-------|---------|
| supported | Matches expected/supported capabilities |
| possible | Stretch but plausible |
| unusual | Far from identity (skateboard tricks, space fight) |
| unsupported | No detectable action verb |

## Prop awareness

Prop `hc:func=sports` on a linked prop adds kick/hold/run to supported set. Cooking tools add stir/taste/cook.

## World awareness

World `hc:world=sports_universe` biases run/kick/celebrate; `community_universe` adds collaborate/greet; `garden_universe` adds plant/harvest/water.

## AI Director consumption

`buildDirectorProposal()` returns `actionIntelligence` with character capability plans and scene suggestions for unusual/possible actions. Mock storyboard actions resolved via `t()` when available for richer classification.

## Shot Planner consumption

- Cooking/sewing → detail beat inclusion
- Sports/celebration → wider closing shot + tracking movement

## Visual Production consumption

`buildSceneImageReadiness()` includes `actionCapabilityHints` from storyboard intelligence. UI panel shows expected actions and scene fit.

## Render Strategy consumption

`buildStudioRenderStrategyPlan()` uses capability-matched action counts to boost `actionComplexity` and shot-split recommendations.

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-character-capabilities.ts` | New types |
| `src/lib/studio-scene-action-extraction.ts` | Shared verb/capability extraction |
| `src/lib/studio-character-capabilities.ts` | Core intelligence layer |
| `src/lib/studio-render-strategy-planner.ts` | Capability-aware complexity |
| `src/lib/studio-shot-planner.ts` | Capability shot hints |
| `src/lib/studio-director-proposal-builder.ts` | actionIntelligence on proposals |
| `src/lib/studio-visual-production-summary.ts` | actionCapabilityHints |
| `src/types/studio-director-proposal.ts` | DirectorProposalActionIntelligence |
| `src/components/studio/studio-character-capabilities-summary.tsx` | UI (NL/EN) |
| `src/components/studio/director-v2/studio-director-panel-v2.tsx` | Wired UI |
| `src/components/studio/studio-workspace-visual-production-panel.tsx` | Wired UI |
| `src/i18n/locales/en.ts`, `nl.ts` | Full parity |
| `src/lib/studio-character-capabilities-foundation.test.ts` | 12 tests |
| `package.json` | Test registration |
| `docs/studio-character-capabilities-reality-audit.md` | Audit |

## Wat bewust niet gebouwd is

- Animation planner
- Action sequencer
- Vidu execution / new providers
- Schema migrations
- New render engine / timeline editor
- Hard action blocks
- Server-side project memory action persistence

## Wat de volgende sprint moet zijn

1. **Action → shot distribution** — map classified action chains to concrete beat sequences per scene
2. **Animation planner** — use capabilities as constraints for motion keyframe planning
3. **Cross-storyboard project memory** — aggregate action trends server-side across all storyboards
4. **Explicit capability overrides** — optional user-defined “can also do X” without schema (continuityNotes marker)

## Tests/build status

| Check | Status |
|-------|--------|
| prisma validate | ✅ |
| prisma generate | ✅ |
| lint | ✅ (0 errors) |
| build | ✅ |
| tests | **1662/1662** pass |

New tests: chef/garden/designer capabilities, prop/world influence, classification, render complexity, shot planner, director consumption, action memory trends.
