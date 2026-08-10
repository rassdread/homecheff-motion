# SP.2B — Cookie Verification

**Date:** 2026-08-10

| Cookie | Product | Domain | Written by SSO? |
|--------|---------|--------|-----------------|
| `next-auth.session-token` | HomeCheff | often `.homecheff.eu` | HC login |
| `growth_session` | Growth | host-only | Growth callback |
| `studio_session` | Studio | **host-only** | Studio callback via `applyStudioSessionToResponse` |
| `studio_sso_pending` | Studio | host-only | Start/callback (TTL 10m) |
| `hc_session` | Legacy | cleared on write | Dual-read Studio HMAC only |

### Containment checks

| Rule | Status |
|------|--------|
| No `Domain=.homecheff.eu` on `studio_session` | **PASS** |
| Growth JWT not accepted as Studio session | **PASS** (shape check) |
| Pending cookie HttpOnly + SameSite=lax | **PASS** |
| Studio never writes `growth_session` | **PASS** |
| Studio never implements Google cookies | **PASS** |
