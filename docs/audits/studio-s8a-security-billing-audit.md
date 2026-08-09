# S.8A — Security Billing Audit

**Date:** 2026-08-09 · **Read-only**

## Threat matrix (financial)

| Threat | Current control | Residual risk |
|--------|-----------------|---------------|
| Double spending same Job | `chargeFinalized` once | Low on wired Jobs |
| Double billing without key | Fallback idempotency unique per request | **High** on double-click |
| Missing billing | Free registry + admin/production bypass | Documented; admin is intentional |
| Missing credits gate | Enforcement audit list + gates | Bare routes still gated via billProviderAction when wired correctly |
| Duplicate Jobs | unique (ownerId, idempotencyKey) | Client must send key |
| Duplicate providers | Adapter ids diagnostic | Registry vs actual provider drift |
| Parallel requests | Reserve holds balance | Race mitigated by wallet reservedBalance; needs continued scrutiny |
| Refresh / client retry spam | Depends on client key | Bare STT/translate **medium** |
| Server retries | Technical recover no recharge; new attempt new key | OK if clients follow ADR-008 |
| Admin bypass | `role === "admin"` → 0 credits | Intentional; monitor abuse |
| Internal / production bypass | productionTransactionId paths | Must stay non-user |
| Preview / developer bypass | No dedicated preview free tier found | Voice preview **cache** free only |
| Test free EUR video | `isBillingFreeForUser` (admin or BILLING_TEST_MODE_FREE + power) | Env-gated |
| Client fake credits | localStorage editor gate | **Must never trust client** for StudioWallet |

## Ownership checks

Storyboard/animation ownership checks run before many billed routes (403). Admin may view others’ resources — credit payer remains session user when they act.

## Status

**PASS as Product Truth** — residual risks listed for S.8B.
