# PRODUCTION-SMOKE.md

**Production dpl:** `dpl_5DAQnrEAgmBzysYLW8Zs6zK7TMyx`  
**URL:** https://studio.homecheff.eu

| Route | HTTP | Notes |
|-------|-----:|-------|
| `/` | 307 → SSO silent | expected |
| `/projects` | 200 | “Mijn projecten”, `studio-my-projects` |
| `/studio` | 200 | same dpl |
| `/studio/photo-video` | 200 | Quick Video surface present |
| `/api/studio/projects` | 401 | AUTH_REQUIRED (not 500) |

S2F/S2G keys found in client chunk `00va7kdfor6id.js`.
