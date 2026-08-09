# S.8D — Gaps & Missing (After Full Inventory)

**Date:** 2026-08-10 · **Read-only**  
Only items **not** already covered by an equivalent Admin surface.

---

## Missing (true gaps)

| Gap | Why it matters | Existing near-miss | S.8E posture |
|-----|----------------|--------------------|--------------|
| **Honest pack/subscription EUR revenue** in Billing analytics | Current `creditsSold × 0.005` is not EUR | Billing analytics page exists but wrong unit | **Fix metric** — do not new dashboard |
| **Wallet ↔ PCE correlation view** | Operators cannot reconcile credit captures to COGS rows in one place | User ledger may show PCE ids; no portfolio join | Extend Studio Finance or Render Analytics section |
| **Auto Top-Up attempt monitor** | No visibility into ATU success/fail/rate limits | Plan `autoTopUpAvailable` + Stripe page | Small ops panel under Billing — not a new product area |
| **GenerationJob financial browser** | No admin list of jobs / chargeFinalized / idempotency | Render-jobs CSV partial | Optional table; do not rebuild profitability |
| **Global ledger browser + export** | Cross-user audit only via per-user panel | Studio Finance aggregates | Extend finance/users — not new “Audit Center” clone |
| **Promo-codes admin UI** | API orphan | Promotions page creates codes inline | Wire UI to existing API |
| **Billing / Studio Finance in top nav** | Discoverability | Dashboard links only | Nav fix, not new surface |
| **Central alerts / monitoring** | No inbox, no cron digests, no paging | Inline negative-margin banners | Only if ops requires — start from existing banners |
| **Scheduled financial reports** | No cron endpoints | CLI scripts | Keep CLI or add scheduled job later — not a dashboard |
| **Google Vision COGS in admin** | Mislabeled OpenAI (S.8C) | Render PCE tables | Metering fix (product) before UI |
| **ATU consent / payment method truth** | Hardcoded paths (S.8B residual) | — | Service fix, not dashboard |

---

## Not missing (do not rebuild)

| Request smell | Already exists at |
|---------------|-------------------|
| Margin / profit dashboard | `/admin/render-analytics` profitability |
| Credit liability dashboard | `/admin/studio-finance` |
| Pricing / packs / plans admin | `/admin/billing/**` |
| Stripe health | `/admin/billing/stripe` |
| Provider cost CSV | Render analytics export |
| Per-user credits | `/admin/users` billing panel |
| Vidu balance | Dashboard card |
| Cost coverage offline | CLI scripts |

---

## Priority for whatever S.8E becomes

| Priority | Item | Type |
|----------|------|------|
| P0 | Correct Billing analytics revenue definition (or relabel notional) | Fix existing |
| P0 | Publish SoT labels in UI copy (Wallet vs PCE vs CBE) | Fix existing |
| P1 | ATU attempts read-only panel | Small additive |
| P1 | Promo-codes UI → existing API | Small additive |
| P1 | Nav links for Billing + Studio Finance | UX |
| P2 | Wallet↔PCE reconciliation widget | Extend existing |
| P2 | GenerationJob financial table | Additive if ops needs |
| P3 | Global ledger export | Extend |
| P3 | Alerts/cron | Only with clear owner |

---

## Status

**PASS** — gaps are additive fixes/extensions, not greenfield dashboards.
