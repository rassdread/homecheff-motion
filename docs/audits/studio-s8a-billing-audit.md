# S.8A — Billing Audit

**Date:** 2026-08-09 · **Read-only**

## What Billing owns (proven)

- Stripe Checkout (subscription + credit packs)
- Webhook: `checkout.session.completed`, subscription created/updated/deleted, `invoice.paid`, `invoice.payment_failed`
- Customer portal
- Plan catalog (`free` / `creator` / `pro` / `studio` / `enterprise`)
- Pack catalog (500 / 1250 / 3000 / 8000)
- Promo / promotion models
- `StudioBillingPolicy` (carry mode, new-user grants, feature flags)
- `CustomerBillingEvent` EUR sync (motion legacy parallel)

**Hubs:** `stripe-billing.ts`, `/api/stripe/webhook`, `/api/me/studio-credits/*`, `/api/me/billing/portal`, `studio-plan-config.ts`, `studio-credit-packs.ts`

## What Billing does NOT do

- Per-generation authorize/capture (Credits)
- Provider SDK calls
- Monthly credit allotment on invoice (removed Phase 4 — `invoice.paid` only activates billing status)

## Money-in catalog

| Source | Credits granted? |
|--------|------------------|
| Pack checkout | Yes — purchased |
| Subscription invoice | No monthly grant |
| Promos / admin / beta | Yes — promotional / admin |

## Risks

1. Dual catalogs: TS plan/pack defaults vs DB `StudioSubscriptionPlan` / `StudioCreditPack`
2. Parallel EUR motion pricing vs wallet credits — two narratives
3. Carry modes stored; time-boxed expiry **not clearly enforced** by a live scheduler
4. Older docs (motion monetization audit) describe included Vidu pools — **not** current `STUDIO_PLANS`

## Status

**PASS as Product Truth documentation** — no implementation.
