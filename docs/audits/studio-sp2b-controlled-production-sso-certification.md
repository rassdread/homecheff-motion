# SP.2B — Controlled Production SSO certification

**Date:** 2026-08-10 (UTC)  
**Type:** Controlled Production certification (NOT broad cutover)  
**Studio merge:** `337bac8b` (PR #17)  
**HomeCheff merge:** `0cb02792` (PR #12)

---

## Step 1 — Clean PR verification

### Studio PR #17

Intended scope only: SP.2B/SP.2B.1 auth/SSO/login/welcome/docs + additive `centralUserId` migration.  
Minor unrelated-but-safe: `admin/billing/promo-codes` eslint set-state fix.  
**Verdict:** CLEAN for merge.

### HomeCheff PR #12

Files: `lib/identity/sso/*` + `env/.env.append.example` only.  
Feed-related paths in diff: **NONE**.  
**Verdict:** CLEAN — no unrelated feed WIP.

---

## Step 2 — Code gates

| Gate | Result |
|------|--------|
| Studio lint | PASS (0 errors) |
| Studio build | PASS |
| Studio tests | PASS `4794/4794` |
| Studio `tsc --noEmit` | PASS |
| HC lint | PASS (0 errors) |
| HC `test:phase-i2-sso` | PASS |

---

## Step 3 — Production DB safety

| Item | Value |
|------|--------|
| Neon host | `ep-wild-morning-alynrf2i…` |
| Database | `neondb` |
| UTC checkpoint (pre-cert) | `2026-08-10T11:53:14Z` |
| Migration | `20260810120000_studio_central_userid` |
| Migration status | **Already applied** `2026-08-10T00:36:57Z` (shared Preview/Prod DB) |
| SQL | Additive only: `centralUserId`, `centralLinkedAt`, `passwordHash` nullable + unique index |
| Users | 11 |
| StudioAccount | 9 |
| StudioWallet | 9 |
| Storyboards | 22 |
| Linked `centralUserId` | 0 (pre human smoke) |

PITR: Neon continuous restore available on project (no destructive SQL run in this cert).

---

## Steps 4–7 — Deploy + safe defaults

| Item | Value |
|------|--------|
| HC Production deploy (SSO env redeploy) | `dpl_9wD3cDtDz4P7QTQ2x9D1Hi4awE6R` → https://homecheff.eu **Ready** |
| Studio Production deploy | `dpl_6MZL3nBCvQAQTq3RfenSp6FgFdKF` → https://studio.homecheff.eu **Ready** |
| Production callback | `https://studio.homecheff.eu/auth/sso/callback` (exact, no wildcard) |
| HC `STUDIO_SSO_*` | PRESENT |
| HC `CENTRAL_IDENTITY_ENABLED` / `CENTRAL_SSO_ENABLED` | true (issuer live) |
| Studio `CENTRAL_IDENTITY_ENABLED` / `CENTRAL_SSO_ENABLED` | true (SSO entry available) |
| `CENTRAL_IDENTITY_REQUIRED` | **false** |
| `CENTRAL_SSO_JIT_PROVISIONING` | **false** |
| Legacy Studio login | **Available** (details disclosure) |

Rationale: enabling identity+SSO flags exposes Continue with Google / Continue with email without forcing cutover (`REQUIRED=false`, legacy remains).

---

## Automated Production probes (agent)

| Check | Result |
|-------|--------|
| HC `/login` | HTTP 200 |
| HC SSO start (unauth) | 302 → HC login with callback (issuer live) |
| HC wrong redirect | HTTP 400 |
| HC wrong product | HTTP 400 |
| Studio `/login` | HTTP 200; `Doorgaan met Google` + `Doorgaan met e-mail` present |
| Studio `/auth/sso/start` | 302 → `https://homecheff.eu/auth/sso/start?product=studio&redirect_uri=https://studio.homecheff.eu/auth/sso/callback…` |
| `studio_sso_pending` cookie | HttpOnly; Secure; SameSite=Lax; Path=/; **no Domain** (host-only) |
| Primary discarded-password UX | Removed; password input only in legacy details |
| `/studio` | HTTP 200 |

---

## Human / browser E2E (required for GREEN)

| Check | Status |
|-------|--------|
| Controlled existing-user link | **PENDING human** |
| Google Production E2E | **PENDING human** |
| Email/password Production E2E | **PENDING human** |
| Returning-user SSO | **PENDING human** |
| Studio logout (studio_session only) | **CODE:** `clearSession` clears Studio cookies only — **PENDING human confirm** |
| Welcome / deep-link / continuity / duplicates | **PENDING human** |

---

## Logout behaviour (documented)

Studio `/api/auth/logout` → `clearSession()` clears Studio product cookies (`studio_session` / legacy Studio names).  
**No** HomeCheff identity session destroy. **No** fake global SLO.

---

## JIT behaviour

JIT remains **OFF**. HC user without Studio profile → `IDENTITY_NOT_LINKED` (no silent Production create).

---

## Certification gate (Step 24)

Controlled Production SSO is **NOT GREEN** until human browser E2E checklist passes.

**SP.2C: NO-GO**

---

## Recommended human smoke (internal account)

1. Open https://studio.homecheff.eu/login  
2. Confirm Google + email CTAs; legacy only under details  
3. Continue with Google → HC Production → Google → Studio callback  
4. Confirm same Studio user / wallet / projects; `centralUserId` set  
5. Logout Studio only; confirm HC session may remain  
6. Continue with email path; password only on HC  
7. Deep-link `/studio?storyboardId=…`  
8. Confirm no duplicate wallet/user  

Do **not** enable `CENTRAL_IDENTITY_REQUIRED` or JIT after smoke without a separate decision.
