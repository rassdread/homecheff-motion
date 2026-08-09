# S.8D — Billing Admin Audit

**Date:** 2026-08-10 · **Read-only**

Covers Billing Control Center, Studio Finance, Users wallet, Stripe, packs, plans, promos, campaigns, Auto Top-Up admin visibility.

---

## Billing Control Center (`/admin/billing/**`)

### Overview
| Field | Finding |
|-------|---------|
| Purpose | Wallet totals + MRR/ARR snapshot + policy summary |
| Data | `loadAdminBillingOverview` + `loadBillingAnalytics` |
| SoT | Wallet/ledger for credits; plan prices for MRR |
| Duplicate | Analytics page repeats analytics API |
| Missing | True Stripe pack EUR; Auto Top-Up ops |
| Reliability | Credits high; “revenue EUR” **low** (USD_PER_CREDIT misuse) |
| Prod readiness | Usable for ops; do not trust EUR P&amp;L |

### Pricing
| Field | Finding |
|-------|---------|
| Purpose | Edit action creditCost / providerCostUsd; margin status |
| Data | `StudioPricingRule` + registry defaults + `computeActionPricingProfitability` |
| SoT | Catalog overrides (DB wins) |
| Completeness | Full action catalog tooling |
| Risk | Live price mutation — process control required |
| Prod readiness | **Ready** |

### Subscriptions
| Field | Finding |
|-------|---------|
| Purpose | Edit plan EUR, Stripe IDs, discount, storage, visibility, **autoTopUpAvailable** |
| Data | `StudioSubscriptionPlan` |
| SoT | DB plan catalog |
| Auto Top-Up | **Flag only** — no attempt log UI |
| Prod readiness | Ready |

### Credit packs
| Field | Finding |
|-------|---------|
| Purpose | Credits, EUR, bonus, Stripe price ID |
| Data | `StudioCreditPack` |
| SoT | DB pack catalog |
| Prod readiness | Ready |

### Promotions / Campaigns
| Field | Finding |
|-------|---------|
| Purpose | Promo lifecycle; new-user grants; carry mode |
| Data | `StudioPromotion`, `StudioBillingPolicy` |
| Gap | `/api/admin/billing/promo-codes` has **no page** |
| Prod readiness | Ready for promotions; codes API orphan |

### Stripe
| Field | Finding |
|-------|---------|
| Purpose | Connection/env/webhook/price ID readiness; past_due |
| Data | Env + DB + `StudioAccount` |
| SoT | Ops readiness (not transaction ledger) |
| Prod readiness | Ready |

### Billing analytics page
| Field | Finding |
|-------|---------|
| Purpose | KPIs + top promos/plans/packs |
| Critical bug/caveat | `grossRevenueEur = creditsSold * 0.005` — not pack EUR |
| Duplicate | Same API on overview |
| Prod readiness | Credits KPIs OK; revenue/margin **not commercial SoT** |

---

## Studio Finance (`/admin/studio-finance` + card)

| Field | Finding |
|-------|---------|
| Purpose | Outstanding/reserved/sold/granted/spent/refunded; provider/reserved costs; margin alerts; top users/projects; failed-gen refunds |
| Data | `StudioWallet` aggregates + `StudioLedgerEntry` (`usage_capture`, `failed_generation_refund`) |
| SoT | **Wallet A** — correct for credit liabilities |
| Provider cost | From **ledger fields**, not full PCE join — may undercount vs Render Analytics |
| Duplicate | Dashboard card ⊂ full page |
| Missing | Time windows; Stripe EUR; PCE correlation |
| Prod readiness | Ready for credit ops |

---

## Users billing panel

| Field | Finding |
|-------|---------|
| Purpose | Per-user wallet balances, grant/remove, ledger (incl. providerCost, margin, PCE ids when present) |
| Data | `/api/admin/billing/users/[userId]` |
| SoT | Wallet A per user |
| Orphan sibling | Collection `/api/admin/billing/users` (search/policy/grant) unused by UI |
| Prod readiness | Ready |

---

## Auto Top-Up (admin)

| Exists | Missing |
|--------|---------|
| Plan-level `autoTopUpAvailable` toggle | Attempt list / success/fail rates |
| User consent fields in DB (not admin UI) | Threshold monitoring (unused trigger anyway) |
| S.8B certification docs | Live ATU dashboard |

**No dedicated Admin Auto Top-Up surface.** Do not invent a full “billing ATU product” page that duplicates Stripe readiness + pack catalog — only an **ops monitor** is missing.

---

## Ledger

| Exists | Missing |
|--------|---------|
| Embedded in user billing panel | Global ledger browser / filters / export |
| Aggregates in Studio Finance | Cross-user audit trail UI |

---

## Status

**PASS** as Product Truth for Billing Admin. Primary defect: **billing analytics EUR notional**.
