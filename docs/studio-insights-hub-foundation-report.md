# Studio Insights Hub — Foundation Report

## Summary

One central **Inzichten / Insights** tab aggregates project status, explainability, health, learning, snapshots, timeline summary, and a single next best step — using only existing Studio systems.

## Systems combined

Creation Assistant, Production Planner, Creative Review, Story Architect, Director Decision Memory, Production Memory, Production Timeline, Snapshots.

## Explainability

**Waarom zegt Studio dit?** — Each advisory line includes a source label (Scene Generation Plan, Story Architect, Director Preferences, etc.) mapped from existing task/recommendation origins.

## Project status

Seven-phase pipeline derived from domain readiness: Idee → Structuur → Assets → Beelden → Audio → Render → Klaar.

## Learning

Production Memory patterns + Director Preferences learning keys shown under **Studio heeft geleerd** — advisory only.

## Next best action

First blocker or `nowTask` from Creation Assistant — exactly one primary CTA.

## AI Director

`insightSummaryContext` enriches proposals via `enrichIdeaWithInsightsHub()` with phase, health gaps, and next step — no new AI.

## Key files

| File | Role |
|------|------|
| `src/types/studio-insights-hub.ts` | Types |
| `src/lib/studio-insights-hub.ts` | Builder + context + enrichment |
| `src/components/studio/studio-workspace-insights-hub-panel.tsx` | UI |
| `src/lib/studio-insights-hub-foundation.test.ts` | Tests |
| Tool routing | `studio-tool-id.ts`, strip, tool-panel |
| Director | `studio-director-proposal-builder.ts`, proposal type |

## Next sprint

1. Delegate inspector rail to hub view (reduce duplicate computation)
2. Deep-link explanations to exact panel sections
3. Account-level insights across storyboards
4. Collapse redundant Creation Assistant header when hub is primary entry
