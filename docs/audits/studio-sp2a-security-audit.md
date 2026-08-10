# SP.2A — Identity Security Audit

**Date:** 2026-08-10 · **Read-only**  
**Scope:** Identity / session / OAuth — not full app pentest

---

## Findings

| Risk | Severity | Notes |
|------|----------|-------|
| Duplicate account creation (cross-product) | **High (product)** | Same email → independent Studio/HC/Growth users |
| Email collision on future SSO link | **High if JIT naive** | Need Growth-style link rules before Studio SSO |
| Google collision | **N/A Studio** | No Studio Google; HC owns |
| Session fixation | **Low–Med** | New nonce on login; no bind to prior cookie rotation API |
| Session replay | **Med** | Stateless HMAC — logout does not revoke stolen cookie until expiry |
| Cookie isolation | **Good** | Host-only `studio_session`; Growth JWT rejected |
| CSRF | **Med** | Cookie `SameSite=lax`; no CSRF token on login POST audited |
| OAuth validation | **N/A Studio** | HC owns Google/SSO validation |
| Token validation | **OK Studio** | HMAC + timingSafeEqual; user must exist |
| Privilege escalation | **Local** | Role on User; admin APIs `requireAdmin` |
| Cross-product authorization | **N/A** | No cross-product authz bridge |
| Broken identity ownership | **Med** | Studio acts as IdP for itself — conflicts with central law |
| Default `AUTH_SECRET` | **High if prod misconfig** | Dev default string in code |
| Password reset absent | **Med** | Account recovery / compromise response weak |
| Invite single-use | **OK** | `usedAt` / expiry / revoke |

---

## Containment wins (keep)

- No new `Domain=.homecheff.eu` on Studio sessions  
- Legacy dual-read shape check prevents Growth JWT acceptance  
- `isActive` gate on login and `requireActiveUser`

---

## Security Score

**3 / 5** — Solid local cookie containment; weak ecosystem identity integrity and session revocation.
