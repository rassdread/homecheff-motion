# Studio Admin Financial Surfaces (S.8D)

**Status:** ARCHITECTURE INVENTORY (read-only)  
**Date:** 2026-08-10

---

## Navigation reality

**Top chrome** (`admin-layout-chrome.tsx`): Dashboard · Invites · Users · Render Analytics · AI Lab · Examples  

**Missing from top chrome:** Billing Control Center, Studio Finance (reachable via dashboard cards / deep links only).

**Billing sub-nav** (`admin-billing-shell.tsx`): Overview · Pricing · Subscriptions · Credit packs · Promotions · Campaigns · Stripe · Analytics  

---

## Surface map

```
/admin                          Hub + finance/health cards
├── /admin/studio-finance       Wallet ledger finance summary
├── /admin/billing/**           Catalog + commercial control + analytics
├── /admin/users                Per-user wallet / ledger / grants
├── /admin/render-analytics     COGS + CBE + profitability + CSV export
│   └── /admin/render-analytics/export?section=
├── /admin/ai-lab/replicate     Provider probe (not wallet)
└── health cards (dashboard)    OCR/vision/storage/overlay/Vidu balance
```

---

## Update frequency (all on-demand)

| Surface | Load pattern |
|---------|--------------|
| Billing / Studio Finance / Users billing | Client `fetch` on mount / action |
| Render Analytics | SSR `getRenderAnalyticsReport()` + client refresh API |
| Vidu credits | Client fetch; optional `?refresh=1` |
| Health cards | Client fetch / probe |
| CSV export | On download request |
| CLI scripts | Manual npm run |

**No cron / scheduled financial report endpoints** found.

---

## Auth

Admin financial APIs: `requireAdmin()` (`role === "admin"`).  
Same gate for render-analytics and studio-finance.

---

## Export

| Export | Route | Sections |
|--------|-------|----------|
| Render analytics CSV | `/admin/render-analytics/export` (preferred) | render-costs, render-jobs, cost-events, video-costs, customer-billing, provider-costs, project-usage, user-usage, instant-mode-usage |
| Legacy API export | `/api/admin/render-analytics/export` | Same builder — **orphan UI** (API still exists) |

No CSV export on Billing Control Center or Studio Finance pages.

---

## Mutation surfaces (config / money)

| Surface | Mutations |
|---------|-----------|
| Pricing | PATCH rules, sync defaults |
| Subscriptions | PATCH plan fields incl. `autoTopUpAvailable` |
| Credit packs | PATCH pack fields |
| Promotions | Create / enable |
| Campaigns | PATCH grants + carry |
| Users billing | Grant / remove credits |
| Library consistency | Repair (non-financial) |

Read-only: Stripe page, Billing analytics, Studio Finance, Render Analytics, Vidu card.

---

## See also

- `studio-admin-financial-source-of-truth.md` — which table owns which metric  
- S.8D audits — completeness, duplicates, gaps  
