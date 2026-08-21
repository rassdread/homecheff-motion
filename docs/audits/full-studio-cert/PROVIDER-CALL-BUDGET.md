# PROVIDER CALL BUDGET — FULL STUDIO CERT CLOSEOUT

**Hard rule:** no unbounded retries. One recovery path per scenario max.

## Caps (maximum)

| Scenario | OpenAI image | OpenAI vision/QA | Vidu | ElevenLabs | Music | SFX | Render | Est. € |
|----------|-------------:|-----------------:|-----:|-----------:|------:|----:|-------:|-------:|
| A Rode loper | 2 | 1 | 1 | 1 | 0 (fixture) | 0 (fixture) | 1 | ≤25 |
| C Pixar stress (representative) | 6 | 2 | 1 | 1 | 0 | 0 | 0 | ≤40 |
| C Scene5 rerender | 1 | 1 | 0 | 0 | 0 | 0 | 0 | ≤5 |
| D Outfit | 1 (+1 seg) | 1 | 0 | 0 | 0 | 0 | 0 | ≤8 |
| E Location | 1 | 1 | 0 | 0 | 0 | 0 | 0 | ≤6 |
| Product/logo probe | 1 | 1 | 0 | 0 | 0 | 0 | 0 | ≤6 |
| G HomeCheff E2E | 0* | 0 | 0 | 0 | 0 | 0 | 0* | ≤5 |
| I Mobile | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **TOTAL HARD CAP** | **12** | **7** | **2** | **2** | **0** | **0** | **1** | **≤95** |

\*G may reuse prior GAP2 attach path; no new paid generation unless attach requires existing export.

## Abort policy

If actual calls exceed expected by >1 for any scenario → **ABORT** that scenario, classify `CALL_BUDGET_EXCEEDED`, do not continue paid steps in that scenario.
