# Production Planner Reality Audit

## Welke systemen al bestaan

| Systeem | Rol |
|---------|-----|
| `buildStudioUnifiedReadiness` | Cross-domain readiness + fixes |
| `buildStoryboardAssetEvolution` | Present / recommended / missing assets |
| `buildStoryboardIdentityConsumption` | Identity completeness + world |
| `buildStoryboardActionShotDistribution` | Action → shot beats |
| `buildStudioRenderStrategyPlan` | Render approach + images |
| `buildVisualProductionSummary` | Scene images |
| `buildCurrentStoryboardShotPlan` | Shot beats per scene |
| `buildDirectorProposal` | AI Director proposals |
| `buildStudioProductionInsights` | Inspector rail (partial overlap) |

## Welke productie-data al bestaat

- Scene count, duration, action text
- Asset links per scene (characters, locations, props, worlds)
- Image completion per scene
- Voice/music/sound flags on storyboard
- Render strategy + action complexity
- Unified readiness score

## Welke gaten nog bestaan (pre-sprint)

- No single **project-level** overview
- Readiness scattered across Consistency / Visual / Render tabs
- AI Director started from user prompt only — no production context first
- No story structure summary (intro → ending) at project level
- No consolidated “you still need X shots, Y images, Z assets” message

## Welke systemen overlappen

- `buildStudioProductionInsights` vs unified readiness vs asset evolution — same signals, different UIs
- Render strategy shot splits vs action distribution — both count shots
- Per-scene duration advice vs project duration total

## Wat Production Planner moet samenbrengen

One `buildStudioProductionPlan()` that reads existing helpers and outputs:

- Production goal (duration, shots, scenes, gaps)
- Story structure phases
- Asset / action / image / audio / render sections
- Creation guidance (open library / create new — no auto-create)
- `directorContextLines` for AI Director input

No new scoring engine — wraps `buildStudioUnifiedReadiness`.
