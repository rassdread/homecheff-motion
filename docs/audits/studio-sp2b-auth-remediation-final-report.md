# SP.2B — Auth remediation final report

**Date:** 2026-08-10  
**Scope:** Identity environment alignment + native credential UX + existing-user link (no SSO redesign)

Deliverables:

- [homecheff-central-login-experience.md](../architecture/homecheff-central-login-experience.md)
- [studio-sp2b-identity-environment-alignment.md](studio-sp2b-identity-environment-alignment.md)
- [studio-sp2b-native-credential-ux.md](studio-sp2b-native-credential-ux.md)
- [studio-sp2b-existing-user-link-certification.md](studio-sp2b-existing-user-link-certification.md)

Forensic history preserved in the alignment doc (Part 1). Prior SP.2B.1 cert docs are not overwritten.

---

## Decision summary

| Field | Value |
|-------|--------|
| Chosen Preview identity strategy | **Option C (scoped)** — HC Preview IdP uses Production identity DB |
| Preferred Option A | Deferred — Production lacks Studio SSO product + SSO env; merge gated on Preview GREEN |
| HomeCheff IdP host (Preview cert) | HC Preview deployment of `feat/sp2b-studio-sso-issuer` |
| HomeCheff identity DB (after align) | `ep-summer-darkness-a2l0745u…` |
| Pre-align Preview DB | `ep-fragrant-smoke-a2jlex69…` (rollback target) |
| Studio DB | `ep-wild-morning-alynrf2i…` |
| Production identity mutation | Auth/session only; no password/Google/profile rewrite |
| Studio password field before | Collected then discarded (**forbidden**) |
| Studio credential UX after | Continue with Google + Continue with email (HC hosted password) |
| Google UX | Studio button → HC IdP → Google → Studio callback |
| Email UX | Optional hint → HC `/login` |
| Signup | HC register → Studio SSO |
| Forgot password | HC reset |
| JIT | **OFF** (`CENTRAL_SSO_JIT_PROVISIONING=false`) |
| Existing-user link | Enabled without JIT (code) |
| Legacy Studio scrypt | Compatibility only under legacy disclosure |
| Production SSO flags | Remain OFF / unchanged |
| Merge PR #17 / HC #12 | **DO NOT MERGE** until Preview GREEN |
| Final GO / NO-GO for SP.2C | **NO-GO FOR SP.2C** |

---

## Blocking issues

1. Live Preview E2E (Google + email/password + continuity) not completed — Vercel Deployment Protection blocks agent automation.
2. Human smoke checklist (Part 25) not executed.
3. Controlled HC↔Studio link not yet proven live against Production credentials on aligned Preview IdP.
4. Option A Production IdP path still unavailable until issuer is on Production after GREEN.

## Non-blocking risks

1. Option C: Preview IdP writes NextAuth sessions into Production identity DB.
2. Redeploy timing: branch `DATABASE_URL` override must be live on the active Preview deployment.
3. Google OAuth on Preview host must remain allowlisted in Google console.

## Recommended next step

1. Confirm HC Preview redeploy Ready with Production identity DB.
2. Human (Vercel-authenticated) smoke Part 25 on Studio Preview.
3. On PASS → mark Preview GREEN → merge Studio PR #17 + HC PR #12 → controlled Production SSO rollout (flags still conservative).
4. Do **not** start SP.2C until GREEN.
