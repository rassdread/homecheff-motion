# SP.2B — Production existing-user link incident

**Date:** 2026-08-10  
**Symptom:** After successful HomeCheff Google/email auth, Studio shows `IDENTITY_NOT_LINKED`.  
**Credential auth / IdP / callback reachability:** PASS

---

## Failure class

**D. Existing Studio user not found**

(Not E — JIT gating. Resolver already allows existing-user link with JIT=false.)

---

## Trace (Production)

1. `/auth/sso/callback` exchanges code → claims include `centralUserId` + `email` (otherwise `EXCHANGE_FAILED`).
2. `resolveStudioUserFromCentralClaims` looks up by `centralUserId` → none (all Studio `centralUserId` null).
3. Looks up by normalized email → **no candidate** for the authenticated HC email.
4. JIT=false → `IDENTITY_NOT_LINKED`.

---

## Production data (redacted)

| Fact | Value |
|------|--------|
| Studio users with `centralUserId` set | **0 / 11** |
| Studio↔HC exact email overlaps | **2** (only) |
| Overlap with Google provider | **1** Studio user ↔ 1 HC Google user |
| Primary Studio content owner (18 storyboards) | `@homecheff.eu` email — **no HC User with that email** |
| Typical Google HC identities | `@gmail.com` — do not match Studio owner `@homecheff.eu` |

Conclusion: the smoked HC Google identity email is not the same normalized email as the existing Studio owner account the tester expected to open. Auto-link correctly refuses (no unambiguous email candidate).

---

## Code hardening shipped

- Transactional existing-user link (`centralUserId` null + uniqueness checks)
- Case-insensitive email candidate lookup
- Safe observability events (no email/token/password)
- Regression tests: link with JIT=false; NOT_LINKED when no candidate; conflict DENY

Flags unchanged: `CENTRAL_IDENTITY_REQUIRED=false`, `CENTRAL_SSO_JIT_PROVISIONING=false`.

---

## Human retest guidance

For auto-link to succeed, authenticate to HomeCheff with the **same email** as the Studio user to open.

Options:

1. Continue with Google using the HC Google account whose email already overlaps a Studio user (1 known pair), or  
2. Continue with email on HC using credentials for the Studio user’s exact email (requires that HC User to exist), or  
3. Do **not** expect Google Gmail → Studio `@homecheff.eu` owner auto-link (emails differ by design in current data).

Do not enable broad JIT to “fix” this.

---

## SP.2C

**NO-GO** until human retest with an email-matching pair passes.
