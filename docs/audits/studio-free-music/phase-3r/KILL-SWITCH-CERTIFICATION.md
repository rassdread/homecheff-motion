# Phase 3R — Kill Switch Certification

**Date:** 2026-08-28

## Sequence

| Step | Production state | Steve catalog | Verdict |
|---|---|---|---|
| 1. Pilot ON | `PILOT_ENABLED=true`, allowlist Steve ID | `enabled:true`, 5 tracks | PASS (see `PRODUCTION-PILOT-API-CERT.json`) |
| 2. Pilot OFF | `PILOT_*` env vars **removed**; `CATALOG_ENABLED=false` | `enabled:false`, `[]` | PASS |
| 3. Preview blocked | Pilot OFF | All asset requests **403** `FREE_MUSIC_DISABLED` | PASS |

Safe-end deployment (final continuation): **`dpl_B4JoVMygtMEfEJUt3PupkuwyfVwi`**

## Vercel Production env (safe end)

| Variable | State |
|---|---|
| `STUDIO_FREE_MUSIC_CATALOG_ENABLED` | `false` (secret) |
| `STUDIO_FREE_MUSIC_PILOT_ENABLED` | **unset** (code default OFF) |
| `STUDIO_FREE_MUSIC_PILOT_USER_IDS` | **unset** (empty) |

Post-restore API probe (2026-08-28T15:20Z): Steve `enabled:false`.

**KILL_SWITCH = PASS** (re-proven after browser cert window)

No public catalog activation. Pilot authorization had zero effect on account hierarchy.
