# Director Apply Learning — Reality Audit

## What was lost before this sprint

| User action | Previous behavior |
|-------------|---------------------|
| Accept director proposal | Scenes applied; no persistent audit |
| Edit scenes after apply | Drift invisible to Studio |
| Dismiss proposal preview | No rejection signal |
| Partial apply | No distinction from full apply |
| Voice / render changes post-apply | Not tracked |

## Existing systems reused

- **AI Director** — `buildDirectorProposal()` enriches idea with `decisionMemoryContext`
- **Production Timeline** — director audit events merged via `directorApplyAudits`
- **Production Memory** — `decisionPatterns` merged alongside `productionPatterns`
- **Creative Review** — retention suggestion from apply baseline vs current storyboard
- **Creation Assistant** — `directorLearningKeys` advisory section
- **Snapshots** — `compareDirectorApplyBaseline()` compares proposal fingerprint to current state

## Events now recorded (localStorage per storyboard)

| Kind | Trigger |
|------|---------|
| `director_applied` | Full apply success |
| `director_partially_applied` | Partial apply |
| `director_modified` | Drift detected after apply |
| `director_rejected` | Preview closed without apply |

## Change detection (advisory only)

- Scene added / removed / rewritten
- Character removed from scene
- Location changed
- Voice profile changed
- Render strategy changed
- Generic CTA or standard ending removed

## Storage

- Key: `hc-studio-director-decisions-{storyboardId}`
- No Prisma migration
- Max 40 audits per storyboard

## Deliberately not built

- No new AI providers or planners
- No automatic re-training or auto-apply
- No schema migrations
- No version-engine changes
