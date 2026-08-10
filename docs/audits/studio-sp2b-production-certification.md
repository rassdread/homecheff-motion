# SP.2B — Production Certification

**Date:** 2026-08-10  
**Status:** **NOT ENABLED — SAFE DEFAULTS**

---

## Production posture

| Control | Production today |
|---------|------------------|
| Studio SSO flags | Default **OFF** |
| Legacy Studio login | Default **ON** |
| Google on Studio | Absent |
| HC Studio client | Requires deploy of HC registry + secrets |
| Shared cookies | Still forbidden |

---

## Production enablement checklist (future ops)

1. Migrate Production DB (`centralUserId` migration).  
2. Deploy HC with Studio registry.  
3. Set Production secrets + redirect URIs:
   - `https://studio.homecheff.eu/auth/sso/callback`
   - `https://motion.homecheff.eu/auth/sso/callback` (if used)  
4. Enable HC `CENTRAL_SSO_ENABLED` for Studio traffic.  
5. Studio: enable identity+SSO; enable JIT after link policy review.  
6. Smoke: HC Google → Studio; HC email → Studio; legacy path decision.  
7. Optionally set `CENTRAL_IDENTITY_REQUIRED=true` after migration of existing users.  
8. **Never** set `HOMECHEFF_VERCEL_BYPASS_SECRET` in Production.

---

## Certification verdict

**Production SSO: NOT CERTIFIED / NOT LIVE**  
**Production safety (no accidental SSO): PASS** (flags default OFF)
