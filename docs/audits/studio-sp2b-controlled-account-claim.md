# SP.2B — Controlled existing account claim

**Date:** 2026-08-10  
**Mechanism:** Dual-proof (legacy Studio session + authenticated HomeCheff SSO claims)  
**JIT:** unchanged `false`  
**SP.2C:** NO-GO until human claim + Google/email retest PASS

Related: [studio-sp2b-existing-user-link-incident.md](studio-sp2b-existing-user-link-incident.md)

---

## Part 1 — Legacy inventory (Production, redacted)

| Metric | Count |
|--------|--------|
| Studio users `centralUserId` null | **11 / 11** |
| Exact HC email hash match | **2** |
| No HC email match | **9** |
| Primary content owner | `cmoez6kk…` — domain `@homecheff.eu`, **18 storyboards**, account+wallet present, **no HC email match** |

Exact matches remain eligible for same-email auto-link (resolver).  
Mismatched legacy owners require **controlled claim** (this feature).

---

## Product law

| Path | When |
|------|------|
| Same-email auto-link | New/normal users — authenticated HC email finds unlinked Studio user |
| Controlled claim | Legacy ownership where emails differ — dual proof required |
| JIT create | Genuinely new Studio users only (`CENTRAL_SSO_JIT_PROVISIONING`) |

---

## Dual-proof claim flow

1. User signs into **legacy Studio** (`studio_session`).
2. Account → Settings → **Link your HomeCheff account** (confirm).
3. `/auth/sso/start?intent=claim` stores `claimStudioUserId` from session in signed pending cookie.
4. HomeCheff authenticates → SSO callback.
5. Callback re-checks Studio session still equals `claimStudioUserId`.
6. `claimExistingStudioUser` transaction:
   - target `centralUserId` null (or same → idempotent)
   - incoming `centralUserId` unused elsewhere
   - set `centralUserId` + `centralLinkedAt` only
7. Preserve: User.id, email, passwordHash, StudioAccount, wallet, projects, billing.

---

## Email after claim

HomeCheff email = canonical **authentication** identity.  
Studio product email is **not** overwritten by claim (avoids silent billing/contact rewrite).

---

## Security

| Case | Result |
|------|--------|
| Claim without Studio session | `CLAIM_UNAUTHORIZED` |
| Session ≠ pending claim target | `CLAIM_UNAUTHORIZED` |
| Target already linked to other HC | `CLAIM_ALREADY_LINKED` |
| centralUserId owned elsewhere | `IDENTITY_MAPPING_CONFLICT` |
| Double submit same pair | idempotent success |
| Arbitrary centralUserId without HC claims | impossible (claims from exchange only) |

---

## Audit

`central_identity_claim` via `logStudioSsoEvent` (prefixes only; no tokens/passwords/emails).

---

## Human certification checklist

1. Legacy login as primary Studio owner  
2. Settings → Link HomeCheff → Google/email on HC  
3. Confirm `centralUserId` set; same User.id / wallet / storyboards  
4. Logout Studio → Continue with Google → opens same workspace  
5. Email path same  

**Do not enable JIT.**
