# Failure / Recovery Audit

| Failure | Expected product behavior | Current risk |
|---|---|---|
| Upload fail | Human retry | Generally OK in QV |
| Preview fail | Message + retry | Free Music telemetry exists |
| Generation fail | No silent charge; explain | Credit reservation messaging partial |
| Render/merge fail | Version safety certified; preserve history | Trust OK if UI shows it |
| Network blip | Autosave / reopen | QV local draft strong; Story depends on server |
| Stale asset | Honest error | Technical strings risk |
| Provider fail | Hidden provider names | `/studio/providers` undermines |
| Export fail | Clear next step | QV attach protection certified |

**Principle:** Users need what happened / is work safe / retry / charged?

**Status:** COMPLETE_WITH_POLISH — soften technical errors; hide provider internals.
