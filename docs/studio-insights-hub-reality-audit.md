# Studio Insights Hub — Reality Audit

## Existing insight surfaces (before hub)

| Surface | What it shows |
|---------|---------------|
| Production Planner | Domain readiness, missing items, creation guidance |
| Creative Review | Quality summary, story/asset/audio/render reviews |
| Creation Assistant | Task queue, blockers, progress, recovery point |
| Story Architect | Narrative gaps, phase recommendations |
| Director Preferences | Apply learning, scene count preferences |
| Production Memory | Historical patterns, recurring styles |
| Production History | Full timeline events |
| Production Insights rail | Story health, unified readiness (inspector) |

## Duplicates identified

- Readiness score appears in Planner, Review, Assistant, Insights rail
- Missing images/assets appear in Planner, Review, Assistant, Generation Plan
- Story phase gaps appear in Architect, Review, Assistant
- Learning patterns appear in Director Preferences, Assistant, Memory

## Not visible enough

- Explanation **source** (why Studio says X) was implicit
- Single **next best step** buried in task lists
- **Project phase** (idea → ready) not shown as pipeline
- Snapshot + Director apply summary scattered

## Conflicts

- No hard conflicts — systems are advisory and use shared domain readiness
- Task deduplication in Creation Assistant prevents duplicate actions

## Hub approach

`buildStudioInsightsHubView()` projects existing builders — no new scoring engines.

## Deliberately not built

- No new AI, planners, or memory engines
- No schema migrations
- No replacement of specialized tool panels (links out via `onSwitchTool`)
- Inspector rail unchanged (optional future consolidation)
