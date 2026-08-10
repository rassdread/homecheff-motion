# SP.2B — Identity environment alignment

**Date:** 2026-08-10  
**Type:** Remediation audit (preserves prior forensic diagnosis; does not rewrite it)  
**Studio branch:** `feat/sp2b-studio-sso-consumer`  
**HomeCheff branch:** `feat/sp2b-studio-sso-issuer`  
**Studio PR:** https://github.com/rassdread/homecheff-motion/pull/17 (OPEN — do not merge until Preview GREEN)  
**HomeCheff PR:** https://github.com/rassdread/homecheff-app/pull/12 (OPEN — do not merge until Preview GREEN)

---

## Part 1 — Frozen incident truth (historical)

Do not rewrite the diagnosis. Recorded endpoints (hosts only; no credentials):

| Role | Neon endpoint (prefix) |
|------|-------------------------|
| HC Production-like identity DB | `ep-summer-darkness-a2l0745u…` |
| HC Preview identity DB (pre-alignment) | `ep-fragrant-smoke-a2jlex69…` |
| Studio Preview/shared DB | `ep-wild-morning-alynrf2i…` |

**Proven root causes (prior forensic audit):**

1. Studio Preview authenticated through HomeCheff Preview.
2. HomeCheff Preview used a **different** identity database than HomeCheff Production.
3. Known Production credentials therefore failed on Preview with HomeCheff’s real `"Ongeldige inloggegevens."`
4. Studio email/password field was UX-only: password collected then discarded before HomeCheff validation.
5. JIT was OFF, so even after successful HC auth an unlinked Studio user would hit `IDENTITY_NOT_LINKED` (existing-user link was incorrectly gated behind JIT).

---

## Part 2 — Strategy comparison

| Option | Summary | Security | Production mutation | Account fidelity | Google OAuth | Credential fidelity | Auditability | Rollback | Preview isolation |
|--------|---------|----------|---------------------|------------------|--------------|---------------------|--------------|----------|-------------------|
| **A** Studio Preview → Production HC IdP | Best long-term | High if exact callback allowlist | Session writes only if flags on | High | High (prod Google) | High | High | Revert origin env | Weak (hits prod IdP) |
| **B** Seeded Preview identity | Controlled cert user on Preview DB | Good | Low | Low (new `User.id`) | Preview Google only | Low vs prod passwords | Medium | Easy | High |
| **C** HC Preview shares Production identity DB | Preview IdP app + prod DB | Medium (Preview writes sessions) | Session/auth writes | High (`centralUserId` real) | Depends on Preview Google redirects | High | High | Remove branch DB override | Medium |

### Preferred default

**Option A** — Studio Preview → Production HomeCheff IdP with strict Preview callback allowlist.

### Why Option A was not executable for this Preview certification

1. Production `main` **does not** register Studio as an SSO product (Growth-only registry).
2. Production has **no** `CENTRAL_SSO_*` / `STUDIO_SSO_*` env (issuer inert).
3. Merge/deploy of HC PR #12 to Production is **gated on Preview E2E GREEN** — using Option A would require Production code+flags first → deadlock.
4. Enabling broad Production Studio SSO is explicitly out of scope.

### Chosen for SP.2B Preview certification

**Option C (scoped)** — HomeCheff Preview deployment for `feat/sp2b-studio-sso-issuer` uses Production identity DB (`ep-summer-darkness-a2l0745u…`) via branch-scoped `DATABASE_URL` override.

**Reason:** Validates real central credentials and real `centralUserId` without copying/resetting passwords, without merging unready issuer code to Production, and without seeding a throwaway identity that would break continuity later.

**Rollback:** Remove branch-scoped Preview `DATABASE_URL` override → Preview returns to `ep-fragrant-smoke-a2jlex69…`.

**Post-GREEN Option A cutover:** After Preview GREEN + merge of HC issuer, point Studio Preview `HOMECHEFF_IDENTITY_ORIGIN` at Production IdP and allowlist **exact** Studio Preview callback URI(s) only.

---

## Part 3 — Callback allowlist

Issuer validates exact `redirect_uri` via `assertRedirectAllowed` (no wildcards). Preview defaults for Studio redirects are **empty** — Preview callbacks must be listed explicitly in `STUDIO_SSO_REDIRECT_URI`.

Production Studio callbacks remain separate defaults (`studio.homecheff.eu` / `motion.homecheff.eu`).

---

## Part 4 — Production identity mutation policy

Allowed during Preview certification against Production identity DB:

- Normal authentication / session creation.

Not allowed:

- Password resets / hash copies
- Google re-linkage for convenience
- Creating new Production users solely for Preview
- Writing Studio-specific fields into HomeCheff `User`
- Broad identity DB migrations

Studio-specific provisioning remains in Studio DB only.

---

## Env alignment applied

| Surface | Change |
|---------|--------|
| HC Preview (`feat/sp2b-studio-sso-issuer`) `DATABASE_URL` | Branch override → Production identity host `ep-summer-darkness-a2l0745u…` |
| Studio Preview `HOMECHEFF_IDENTITY_ORIGIN` | Remains HC Preview IdP URL (issuer with Studio client) |
| `CENTRAL_SSO_JIT_PROVISIONING` | Remains **false** for existing-user certification |
| Production SSO flags | Unchanged / OFF |

---

## Verdict

**Environment alignment: CONFIGURED (Option C scoped).**  
Live human/automation Preview smoke still required for GREEN.
