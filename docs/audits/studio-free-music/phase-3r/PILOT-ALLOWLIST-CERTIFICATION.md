# Phase 3R — Pilot Allowlist Certification

**Date:** 2026-08-28  
**Pilot user:** Steve Brown → Studio `user.id` **`cmszybweq0000jl046b7qqvt5`**

## Production API evidence

Captured in `PRODUCTION-PILOT-API-CERT.json` against `https://studio.homecheff.eu`  
Deployment: `dpl_HGoT6oiWZ6WMVX4mJmewjYFNg2Sg` · SHA `1ef40264`

| Case | Expected | Actual | Verdict |
|---|---|---|---|
| Anonymous catalog | 401 | 401 `AUTH_REQUIRED` | PASS |
| Steve (pilot) | `enabled:true`, 5 tracks | 5 ACTIVE pilot tracks | PASS |
| Non-pilot authenticated | `enabled:false`, `[]` | `enabled:false`, `[]` | PASS |
| Steve preview (5 tracks) | 200 + audio MIME | 200; MP3 + OGG | PASS |
| Non-pilot preview | 403 | 403 `FREE_MUSIC_DISABLED` | PASS |
| Client `audioUrl` spoof | 400 | 400 | PASS |

**PILOT_ALLOWLIST_ENFORCEMENT = PASS**

No hierarchy, billing, or wallet mutations performed.
