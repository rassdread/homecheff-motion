# Motion Execution Consumption — Reality Audit

## Welke metadata nu wordt gelezen

| Metadata | Prefill sprint | Consumption sprint |
|----------|----------------|-------------------|
| `viduExecutionPlan.executionMode` | ✓ mode preselect | ✓ mode + segment counts |
| `viduExecutionPlan.jobs` | ✓ counts/warnings | ✓ transition units |
| `viduExecutionPlan.totalJobCount` | ✓ | ✓ vs transition row validation |
| `animationPlan.scenes[].targetDuration` | ✓ wizard durations | ✓ consumption durations |
| `animationPlan.shots[]` | ✓ missing images | ✓ image slot roles |
| `renderStrategyPlan` | ✓ fallback mode | ✓ via prefill chain |

## Welke metadata wordt genegeerd

- Full `inputImages` on jobs (stripped in handoff slim plan) — derived from animation shots + scene stills
- Provider prompt payloads — unchanged
- Auto-render triggers — intentionally excluded

## Welke projectvelden automatisch ingevuld kunnen worden

| Field | Consumption |
|-------|-------------|
| `instantMode` | From execution mode |
| `transitionSeconds` | From animation plan average |
| `durationSec` | From animation / execution estimate |
| `sceneSlots[].text.durationSeconds` | Per-scene animation timing |
| `studioHandoff.executionConsumption` | Summary persisted on import/refresh |

## Welke mappings al bestaan

- `story_video` → story mode, 1 transition row, scene still slots
- `action_chain` → transition mode, N−1 rows from image count, job count validation
- `hybrid` → story mode + story/action segment counts

## Welke risico's bestaan

1. **Job count vs transition rows** — action_chain may plan one job per scene while Motion creates N−1 adjacent pairs; warning shown, no block
2. **End pose images** — mapped as missing slots, not auto-generated
3. **Transition mode max 5 images** — large action chains may exceed limit
4. **Hybrid** — opens in story mode; action segments noted in readiness only
