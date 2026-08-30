# Phase 4 — Kill-Switch Rollback Drill

**Purpose:** Prove `STUDIO_FREE_MUSIC_CATALOG_ENABLED=false` disables public catalog without destroying assets/registry/project state.

**Verdict:** ROLLBACK_DRILL = **PASS**

## Procedure executed

1. Public-ON baseline certified (`dpl_AP5rfrJBBCoR1tyhti53xuheBHUi`, SHA `da4871c7…`).
2. Set `STUDIO_FREE_MUSIC_CATALOG_ENABLED=false`; redeployed → `dpl_ENbASoEvwJHEXjR3ebVrnHbWW7Nj`.
3. Verified (`ROLLBACK-OFF-CERT.json`):
   - Anonymous catalog **401**
   - Non-pilot: `enabled=false`, **0** tracks
   - Steve pilot (still configured at that moment): **55** tracks (pilot path intact)
   - Spoof still **400**; non-pilot asset **403**
   - No registry/blob mutation performed
4. Restored `STUDIO_FREE_MUSIC_CATALOG_ENABLED=true`; removed temporary pilot env vars.
5. Final public state re-certified (`FINAL-PUBLIC-STATE.json`).

## Evidence table

| Step | Timestamp (UTC) | Deployment | Result |
|---|---|---|---|
| Public ON baseline | 2026-08-30T10:30:07Z | `dpl_AP5rfrJBBCoR1tyhti53xuheBHUi` | PASS |
| Kill switch OFF | 2026-08-30T11:03:06Z | `dpl_ENbASoEvwJHEXjR3ebVrnHbWW7Nj` | PASS |
| Public ON restored + pilot removed | 2026-08-30T11:50:28Z | `dpl_Ak85q7xw92trVGq8xQS2dWomZPYX` (live) | PASS |

**Note:** Configuration rollback only — not a data rollback.
