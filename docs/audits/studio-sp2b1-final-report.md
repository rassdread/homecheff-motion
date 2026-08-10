# SP.2B.1 — Final Report — Unified HomeCheff Login UX

**Phase:** SP.2B.1  
**Date:** 2026-08-10  
**Mode:** UX presentation layer on top of existing SP.2B SSO — clean freeze

---

## Identity card

| Field | Value |
|-------|-------|
| Repository | `rassdread/homecheff-motion` |
| Branch | `feat/sp2b-studio-sso-consumer` |
| Base commit (pre SP.2B.1) | `9004c9e9` |
| SP.2B.1 commit | `2f76ce84` |
| PR | https://github.com/rassdread/homecheff-motion/pull/17 (**OPEN**, not merged) |
| Architecture changed? | **No** |
| Studio-native Google OAuth? | **No** |
| Visible “Continue with HomeCheff”? | **Removed** (primary UX) |
| Native Google + email UI? | **Yes** (Studio code) |
| First-visit Studio wizard? | **Yes** (`/welcome`) |
| Growth native login? | **Deferred** |
| Silent on-page password verify? | **Gap** — password validated on HomeCheff |
| Preview live cert | **NO-GO** (Deployment Protection) |
| Production SSO | **OFF** |
| Merge | **NOT DONE** |
| **GO / NO-GO for SP.2C** | **NO-GO** |

---

## Product law (re-verified)

| Rule | Status |
|------|--------|
| HomeCheff = sole IdP | **PASS** |
| Studio = SSO consumer | **PASS** |
| Google button → HomeCheff | **PASS** (`/auth/sso/start`) |
| Email/password → HomeCheff | **PASS** (email hint + IdP validate) |
| Forgot password → HomeCheff | **PASS** |
| Signup → HomeCheff register | **PASS** (SSO live) |
| `studio_session` host-only | **PASS** |
| No Studio Google provider | **PASS** |
| No second password store for IdP users | **PASS** |
| No duplicate identity architecture | **PASS** |

---

## Local gates

| Gate | Result |
|------|--------|
| lint | **PASS** |
| build | **PASS** |
| tsc | **PASS** |
| tests | **PASS** `4794/4794` |

Excluded from commit: `scripts/_sp2b-db-snapshot.ts` (unrelated WIP).

Included gate fix: `src/app/admin/billing/promo-codes/page.tsx` (pre-existing eslint `set-state-in-effect`).

---

## Preview UX smoke

| Item | Status |
|------|--------|
| native `/login` | **CODE PASS** · live **BLOCKED** |
| Google via HomeCheff | **CODE PASS** · live **BLOCKED** |
| email/password via HomeCheff | **CODE PASS** · live **BLOCKED** |
| signup | **CODE PASS** · live **BLOCKED** |
| forgot password | **CODE PASS** · live **BLOCKED** |
| first-use wizard | **CODE PASS** · live **BLOCKED** |
| returning-user bypass | **CODE PASS** · live **BLOCKED** |
| no duplicate identity | **CODE PASS** · live **BLOCKED** |
| wallet/projects continuity | **CODE PASS** (resolve/JIT) · live **BLOCKED** |
| studio_session | **CODE PASS** · live **BLOCKED** |
| SP.2B SSO Preview GREEN | **NO** |

---

## Blocking issues

1. Vercel Deployment Protection on Preview → `vercel.com/sso-api` (agent cannot smoke).  
2. Underlying SP.2B live SSO still not GREEN.

## Non-blocking risks

1. Password field is UX continuity until HC credential-forward API exists.  
2. Forgot-password has no Studio return URL on HC.  
3. Growth UX parity not in this repo.

## Recommended next step

Human browser smoke on Studio + HomeCheff Preview aliases (bypass Vercel protection), then mark SP.2B + SP.2B.1 Preview GREEN before any merge or SP.2C.
