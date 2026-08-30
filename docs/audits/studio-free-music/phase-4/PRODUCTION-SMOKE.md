# Phase 4 — Production Public Smoke

## First public-ON smoke (Phase 4 code deploy)

**SHA:** `da4871c7442c1bbc300d1d160f1a1d5a925e5946`  
**Deployment:** `dpl_AP5rfrJBBCoR1tyhti53xuheBHUi`  
**Evidence:** `PRODUCTION-SMOKE.json`  
**Verdict:** **PASS**

| Check | Result |
|---|---|
| Anonymous catalog | 401 |
| Auth users (pilot + non-pilot) | enabled, 55 tracks |
| Preview sample | 5/5 200 |
| Spoof | 400 |

## Final public state (after rollback restore + pilot removal)

**SHA:** `cfe6907f2141cfdfa3eafd02c6ec5ddea8d13636`  
**Deployment:** `dpl_Ak85q7xw92trVGq8xQS2dWomZPYX`  
**Evidence:** `FINAL-PUBLIC-STATE.json`  
**Verdict:** **PASS**

| Check | Result |
|---|---|
| Anonymous | 401 |
| Steve (public flag only) | 55 |
| Non-pilot | 55 |
| Preview | 5/5 200 |
| Spoof | 400 |
| Pilot env | absent |

Note: legacy cert field `nonPilotAssetBlocked=FAIL` is **expected** under public ON (authenticated asset access allowed).
