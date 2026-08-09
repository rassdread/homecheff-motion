# S.8A — Subscription Audit

**Date:** 2026-08-09 · **Read-only**

## Naming map (requested → code)

| Requested | Code reality |
|-----------|--------------|
| Free | Plan `free` |
| Starter | **No** — closest `creator` |
| Professional | **No plan** — closest `pro`; UX mode `PROFESSIONAL` ≠ billing |
| Enterprise | Plan `enterprise` (custom; no Stripe env price) |
| Internal | Cost label only — not a SKU |
| Affiliate | Content/SEO only — not billing |
| Developer | UI label — not billing |
| Admin | **User.role**, not plan |

## Implemented plans

| Plan | Monthly € | monthlyCredits | Pack discount | Auto top-up | Storage |
|------|-----------|----------------|---------------|-------------|---------|
| free | 0 | **0** | 0% | no | 1 GB |
| creator | 7.99 | **0** | 10% | yes | 5 GB |
| pro | 24.99 | **0** | 15% | yes | 25 GB |
| studio | 79.99 | **0** | 20% | yes | 100 GB |
| enterprise | custom | **0** | 25% | yes | unlimited |

Yearly = 10× monthly (official helper).

## How users get credits under a subscription

Packs + promos + grants — **not** invoice monthly allotment.

## Fair use under subscription

No plan-level fair-use meter. Hard stop = wallet `insufficient_credits` / free-account gate.  
Motion has **role-based** AnimationUsageLedger caps (orthogonal to plan).

## Carry / cancel

- Default carry policy: `UNLIMITED`  
- Cancel → `billingStatus: prepaid`, retain credits (`applySubscriptionCancellationPolicy`)  
- Time-boxed carry modes exist on policy; **scheduler enforcement not proven**

## Hidden plans

None beyond `STUDIO_PLANS` + DB catalog mirrors. Roles `power`/`admin` are not plans.

## Status

**PASS as Product Truth**.
