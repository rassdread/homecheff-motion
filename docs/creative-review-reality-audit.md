# Creative Review Reality Audit

## Welke review-systemen al bestaan

| Systeem | Locatie | Scope |
|---------|---------|-------|
| Story Health Advisor | `studio-story-health-advisor.ts` | Verhaalscore + advisories |
| Story Intelligence | `studio-story-intelligence.ts` | Narratieve analyse |
| Unified Readiness | `studio-unified-readiness.ts` | 9 checks + fixes + render warnings |
| Consistency Overview | `studio-consistency-overview.ts` | 8 domeinen + overall score |
| Continuity Score | `studio-project-continuity-score.ts` | Reuse + alignment |
| Production Insights | `studio-production-insights.ts` | Inspector rail bundel |
| Production Planner | `studio-production-planner.ts` | missingItems, recommendations, storyStructure |
| Asset Evolution | `studio-asset-evolution.ts` | present/recommended/missing + advice |
| Identity Consumption | `studio-identity-consumption.ts` | Completeness + consistency checks |
| Action Intelligence | `studio-character-capabilities.ts` | Scene action classifications |
| Action Distribution | `studio-action-shot-distribution.ts` | Shots per action chain |
| Visual / Image Readiness | `studio-visual-production-summary.ts` | Image gaps |
| Scene Generation Plan | `studio-scene-generation-orchestrator.ts` | Image queue + readiness |
| Render Strategy + Vidu Execution | render + execution planners | Strategy, fallback, warnings |
| Production Memory | `studio-production-memory-profile.ts` | Patronen + creation guidance |
| Director Proposal | enrichment + memory + readiness | Proposal-time suggestions |

**Gap:** geen centrale **project-level Creative Review** die deze signalen samenvat.

## Welke kwaliteitschecks al bestaan

- Unified readiness checks (scenes, images, voice, text_beats, emotion, …)
- Story health advisories (too short/long, missing climax, similar scenes, …)
- Domain readiness in production plan (story, assets, images, audio, render)
- Identity completeness/consistency checks
- Animation plan readiness (timing, images, action structure)
- Vidu execution readiness + missing requirements

## Welke verbeteradviezen al bestaan

- `ProductionPlan.recommendations` + `creationGuidance`
- `SceneGenerationPlan.recommendations`
- Unified readiness `fixes[]`
- Consistency fix suggestions
- Director `consistencySuggestions`, `memorySuggestions`
- Asset evolution continuity/visual/shot advice
- Production memory planner/brief recommendations

## Welke systemen overlappen

| Overlap | Systemen |
|---------|----------|
| Readiness score | Unified readiness, consistency overview, production planner readiness |
| Missing assets | Asset evolution, production plan missingItems, generation missingAssets |
| Story structure | Production plan storyStructure, story health, story intelligence |
| Render readiness | Unified readiness, proposal render readiness, execution plan |
| Recommendations | Planner, generation, memory, director — deels niet getoond in UI |

## Welke signalen ongebruikt blijven

- Production plan `recommendations` niet overal in workspace UI
- Scene generation `recommendations` compact in production panel only
- Action intelligence scene suggestions verspreid over consistency panel
- Execution fallback plan niet centraal samengevat
- Geen SWOT-achtige samenvatting (sterk/zwak/kansen/ontbreekt)

## Wat een Creative Review moet samenbrengen

1. **`buildCreativeReview()`** — dunne orchestrator, geen nieuwe score engine
2. Domeinreviews: story, assets, actions, images, audio, render, memory
3. Aggregaat: strengths, weaknesses, opportunities, missingElements, improvementSuggestions, qualitySummary
4. **Advies-only** — nooit blokkeren
5. UI-tab op projectniveau + `creativeReviewContext` voor AI Director
