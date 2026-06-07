# Creative Review & Improvement Loop Report

## Reality Audit

Zie [creative-review-reality-audit.md](./creative-review-reality-audit.md).

## Welke systemen al bestonden

- Story Health Advisor + Story Intelligence
- Unified Readiness + Consistency Overview
- Continuity Score + Production Insights (inspector rail)
- Production Planner (storyStructure, missingItems, recommendations)
- Asset Evolution + Identity Consumption
- Action Intelligence + Action Shot Distribution
- Visual Production Summary + Scene Generation Orchestrator
- Render Strategy + Animation Plan + Vidu Execution Plan
- Production Memory + Director proposal enrichment

## Wat is hergebruikt

`buildCreativeReview()` roept **alleen bestaande builders** aan — geen nieuwe score engine, geen nieuwe planners, geen LLM.

| Domein | Hergebruikte entry points |
|--------|---------------------------|
| Story | `buildStoryHealthAdvisorReport`, `productionPlan.storyStructure` |
| Readiness | `buildStudioUnifiedReadiness` (35/65 blend voor qualitySummary) |
| Assets | `buildStoryboardAssetEvolution`, `buildStoryboardIdentityConsumption` |
| Actions | `buildStoryboardActionIntelligence`, `buildStoryboardActionShotDistribution` |
| Images | `buildSceneGenerationPlan`, `buildVisualProductionSummary` |
| Audio | `productionPlan.audioPlanning` |
| Render | `productionPlan.renderPlanning`, `buildStudioAnimationPlan`, `buildViduExecutionPlan` |
| Memory | `resolveProductionMemoryProfile` |

## Hoe Creative Review werkt

1. Input: storyboard + libraries + optional project memory
2. Single orchestration pass in `src/lib/studio-creative-review.ts`
3. Output: SWOT-achtige aggregatie + per-domein reviews + `directorContextLines`
4. **Advies-only** — nooit mutatie, nooit blocking

## Hoe Story Review werkt

- Fases intro/setup/development/climax/ending uit Production Planner `storyStructure`
- Status: Sterk / Zwak / Ontbreekt (present/strong → sterk, weak → zwak, missing → ontbreekt)
- Story Health advisories als extra signalen

## Hoe Asset Review werkt

- Missing characters/locations/props/worlds uit Asset Evolution
- Identity completeness checks als partial items

## Hoe Action Review werkt

- `sceneClassifications` → supported/unusual/unsupported
- Action distribution → meer shots nodig, missing supporting assets

## Hoe Image Review werkt

- Scene Generation readiness (required/recommended missing)
- Visual summary scenes without image
- Generation step count → volgorde logisch

## Hoe Audio Review werkt

- Narration, transcript, music, sound uit `audioPlanning`
- Status: klaar / gedeeltelijk / ontbreekt — geen generatie

## Hoe Render Review werkt

- Aanbevolen strategie + confidence uit production plan
- Animation readiness (images, action structure)
- Execution warnings + fallback actief

## Hoe Production Memory wordt gebruikt

- Similar productions + successful patterns → opportunities
- Deviation signal wanneer idee niet matcht met eerdere patronen

## Hoe AI Director wordt verbeterd

- `buildCreativeReviewContext()` in proposal builder
- `creativeReviewContext` op `StudioDirectorProposal`
- `enrichIdeaWithCreativeReview()` in enrichment chain (na production memory)

## Welke bestanden zijn aangepast

| Bestand | Rol |
|---------|-----|
| `src/types/studio-creative-review.ts` | Types |
| `src/lib/studio-creative-review.ts` | `buildCreativeReview()` |
| `src/lib/studio-creative-review-foundation.test.ts` | 10 tests |
| `src/components/studio/studio-workspace-creative-review-panel.tsx` | UI tab |
| `src/lib/studio-tool-id.ts` | `creativeReview` tool |
| `src/components/studio/studio-tool-strip.tsx` | Tab label |
| `src/components/studio/studio-workspace-tool-panel.tsx` | Panel routing |
| `src/components/studio/studio-tool-placeholder-panel.tsx` | Title keys |
| `src/lib/studio-director-proposal-builder.ts` | Director context |
| `src/types/studio-director-proposal.ts` | `creativeReviewContext` |
| `src/i18n/locales/en.ts`, `nl.ts` | Volledige parity |
| `docs/creative-review-reality-audit.md` | Audit |

## Wat bewust niet gebouwd is

- Geen nieuwe AI / ML / auto-fix loop
- Geen nieuwe readiness of consistency engines
- Geen schema-migratie
- Geen scene-level review tab (projectniveau only)
- Geen automatische wijzigingen aan storyboard

## Wat de volgende sprint moet zijn

1. Inspector rail → projecteer `buildCreativeReview()` i.p.v. losse insights calls
2. E2E: review tab → jump to tool via `onSwitchTool`
3. Proposal preview sectie: top 3 weaknesses + recommendations
4. Persist review snapshot per storyboard version (optioneel, client-side)
5. Improvement loop: user marks suggestion “done” (expliciet, geen auto)

## Tests/build status

```bash
npx prisma validate && npx prisma generate
npm run lint && npm run build && npm run test
```

- Foundation tests: `studio-creative-review-foundation.test.ts` — **10/10**
- Full suite: **1757/1757** pass
