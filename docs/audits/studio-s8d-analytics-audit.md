# S.8D — Analytics Audit

**Date:** 2026-08-10 · **Read-only**

Covers Render Analytics, profitability, provider costs, CustomerBillingEvents, telemetry, exports, CLI reports.

---

## Render Analytics (`/admin/render-analytics`)

| Field | Finding |
|-------|---------|
| Purpose | Unified ops + cost + revenue(CBE) + profitability + scale forecast |
| Data composer | `getRenderAnalyticsReport()` |
| Modules | credits, cost, billing-analytics (CBE), video-cost, studio-cost, profitability, CSV |
| Update | SSR load + `GET /api/admin/render-analytics` refresh |
| Export | Page route CSV sections (preferred); legacy API export orphan |
| Owner | `src/server/admin/render-analytics*.ts` + `studio-profitability.ts` |
| Completeness | Broadest admin analytics surface |
| Reliability | High for aggregates that exist; documents data gaps in report |
| Prod readiness | **Ready** — primary COGS/profit UI |

### Sections present (proven)

- Cost overview / financial period summaries  
- Render stats, by-type, instant mode  
- Provider costs  
- Project / user / storage analysis  
- Customer billing events table  
- **Studio profitability** (executive, provider, feature, project, user, unit economics, negative margin, asset derivation ROI, subscription simulation)  
- Revenue overview (CBE)  
- Pricing table v1 / video economics / margin simulation / recent cost events  
- Scale forecast / balance snapshots / data gaps  

### GenerationJobs

No dedicated GenerationJob admin browser. Job-related data appears indirectly via render-jobs CSV, cost events, expensive renders. **Financial Job state (`chargeFinalized`, idempotency) is not a first-class admin table.**

---

## Profitability layer

| Field | Finding |
|-------|---------|
| Service | `buildStudioProfitabilityReport` |
| Revenue SoT | `CustomerBillingEvent` (EUR) |
| Cost SoT | `ProviderCostEvent` (USD → EUR via FX) |
| Gap vs Studio wallet | Pack Checkout EUR **not** joined; Studio-prepaid generations often show **€0 CBE revenue** while wallet captured credits |
| Consequence | Feature profitability can look “unmonetized” for wallet-billed Studio actions (known S.8A/S.8C) |
| Duplicate | Negative-margin concepts also on Studio Finance (ledger marginEstimate) — **different SoT** |

---

## Provider cost / usage telemetry in admin

| Signal | Where shown |
|--------|-------------|
| ProviderCostEvent | Render analytics tables + CSV `cost-events` / `provider-costs` |
| ProviderUsageLog | Credit analytics / video costs (legacy supplement) |
| ProviderCreditBalanceSnapshot | Balance snapshots section |
| AnimationUsageLedger | Instant/mode usage |
| Studio ledger providerCostUsd | Studio Finance / user ledger — **not** full PCE |

---

## Billing analytics (wallet) vs Render billing analytics (CBE)

| | `/admin/billing/analytics` | Render `billing-analytics.ts` |
|--|---------------------------|-------------------------------|
| Revenue | `creditsSold × 0.005` labeled EUR | Sum `CustomerBillingEvent.grossPriceEur` |
| Cost | Ledger `providerCostUsd` | PCE linked / period costs |
| Use | Commercial wallet KPIs (broken EUR) | Motion/video quote economics |
| Do not merge blindly | — | — |

---

## Health / monitoring / alerts

| Exists | Missing |
|--------|---------|
| Dashboard health cards (OCR, vision, overlay, storage) | Central alerts inbox |
| Negative-margin banners (finance + profitability) | Threshold alerting / paging |
| Stripe past_due on Stripe page | Financial SLO monitors |
| Vidu balance card | Low-balance alert automation |
| No cron financial reports | Scheduled digests |

---

## CLI / internal reports (no Admin page)

| Script | Role |
|--------|------|
| `npm run audit:profitability` (`profitability-audit.ts`) | Registry margin vs packs |
| `studio-cost-coverage-report.ts` | Coverage scorecard |
| `studio-pricing-rebalance-report.ts` | Rebalance scenarios |
| `billing-verification-check.ts` | Stripe/env/DB readiness |
| `audit-subscription-prices.ts` | DB vs Stripe amounts |
| `backfill-billing-events.ts` / `backfill-vidu-costs.ts` | Historical PCE/CBE |

These are **ops tools**, not duplicates of dashboards — keep as CLI unless a thin “run report” admin action is later justified.

---

## Status

**PASS** — analytics landscape mapped; wallet vs CBE revenue split is the defining risk.
