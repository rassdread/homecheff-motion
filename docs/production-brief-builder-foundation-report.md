# Production Brief Builder Foundation Report

## Reality Audit

See [production-brief-reality-audit.md](./production-brief-reality-audit.md).

**Summary:** Studio previously created empty storyboards immediately and deferred production understanding to AI Director inside the workspace. Production Brief intercepts the create flow so users describe intent first.

## Hoe nieuwe verhalen nu ontstaan

```
Mijn videoverhalen → Nieuw verhaal → Vertel wat je wilt maken
  → Production Brief → Verhaalvoorstel → Videoverhaal aanmaken → Workspace
```

`StudioNewStoryButton` routes to `/studio/storyboards/new` (brief wizard) instead of auto-creating an empty storyboard.

## Wat Production Brief toevoegt

- Structured **`StudioProductionBrief`** before any scenes exist
- Asset recommendations with **Gebruik bestaand / Bouw nieuw / Overslaan** (no auto-create)
- Story preview (scenes, shots, duration, characters, locations) with user confirmation
- `aiDirectorPrompt` persisted at storyboard create time
- AI Director proposal applied on create (scenes + linked existing assets)

## Hoe Brief Builder werkt

**`buildProductionBrief()`** in `src/lib/studio-production-brief-builder.ts`:

| Input | Engine |
|-------|--------|
| User idea | `interpretAiDirectorPrompt`, `extractProposalTopic` |
| Project memory | `findRecurringMatchesForIdea` |
| Asset libraries | `buildDirectorProposal` (entity keywords, token match) |
| Action intensity | `extractActionSteps` + sport/dynamic heuristics |
| Duration/shots/scenes | `buildStudioProductionPlan` + director synthetic flow |

**Output:** goal, estimatedDuration, contentType, world, mainCharacters, actionIntensity, targetStyle, callToAction, recommendations, storyPreview.

No new AI, LLM, or providers.

## Hoe AI Director Brief gebruikt

- `buildDirectorProposal` accepts optional `productionBrief`
- Idea enriched via `enrichIdeaWithProductionBrief()` (`src/lib/studio-production-brief-enrichment.ts`)
- Brief context prepended: goal, duration, style, action, world, characters, CTA

## Hoe Production Planner Brief gebruikt

- `StudioProductionPlanInput.productionBrief` optional field
- When storyboard has **0 scenes** and brief is provided, `applyProductionBriefOverrides()` sets:
  - Estimated duration, shots, scenes from brief preview
  - Asset planning from brief recommendations
  - Director context lines prefixed with brief metadata

## Hoe asset aanbevelingen werken

1. Director proposal assigns existing library assets via token match
2. Entity keyword detection proposes new characters/locations/props
3. `findRecurringMatchesForIdea` boosts assets from project memory
4. UI shows recommendations with three choices — **no automatic asset creation**

## Hoe storyboard voorstellen werken

1. User confirms story preview (scene/shot/duration counts)
2. `createStoryboardFromProductionBrief()` creates storyboard with brief metadata
3. `buildDirectorProposal` + `applyDirectorProposal(mode: "all")` creates scenes
4. Redirect to workspace with populated story

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-production-brief.ts` | Brief types |
| `src/lib/studio-production-brief-builder.ts` | `buildProductionBrief()` |
| `src/lib/studio-production-brief-enrichment.ts` | Idea enrichment |
| `src/lib/studio-production-brief-builder-foundation.test.ts` | Tests |
| `src/lib/studio-create-story-from-brief-client.ts` | Create + apply flow |
| `src/lib/studio-production-planner.ts` | Brief overrides |
| `src/lib/studio-director-proposal-builder.ts` | Brief consumption |
| `src/types/studio-production-plan.ts` | `productionBrief` input |
| `src/lib/studio-storyboard-validation.ts` | `aiDirectorPrompt` on create |
| `src/server/studio/studio-storyboard-service.ts` | Persist prompt on create |
| `src/components/studio/studio-production-brief-flow.tsx` | Brief wizard UI |
| `src/app/studio/storyboards/new/page.tsx` | Brief page |
| `src/components/studio/studio-new-story-button.tsx` | Route to brief |
| `src/i18n/locales/en.ts`, `nl.ts` | Full NL/EN parity |
| `docs/production-brief-reality-audit.md` | Audit |
| `package.json` | Test script entry |

## Wat bewust niet gebouwd is

- No new AI / LLM / providers
- No schema migration (uses existing `aiDirectorPrompt` column)
- No new storyboard engine or render engine
- No auto-create for proposed-new assets
- No dedicated brief JSON column (structured brief is in-memory + derived from prompt)
- Asset choice state not persisted to DB (UI-only for this sprint)
- Workspace AI Director not auto-run on load (user lands with scenes already applied)

## Wat de volgende sprint moet zijn

1. **Persist brief snapshot** — optional JSON on storyboard for revision/compare
2. **Asset choice application** — honor use/build/skip when applying proposal
3. **Continuity panel in brief step** — show recurring assets with usage stats inline
4. **Production tab preview** — show full production plan during brief step
5. **E2E test** — create story via brief flow smoke test
6. **Workspace handoff banner** — “Created from production brief” with edit link

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ |
| `npx prisma generate` | ✅ |
| `npm run lint` | ✅ (0 errors) |
| `npm run build` | ✅ |
| `npm run test` | ✅ **1727/1727** |
| Brief foundation tests | ✅ 7/7 |
