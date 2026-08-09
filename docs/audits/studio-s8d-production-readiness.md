# S.8D — Admin Financial Production Readiness

**Date:** 2026-08-10 · **Read-only**

---

## Scorecard

| Surface | Prod ready? | Notes |
|---------|-------------|-------|
| Billing catalog (packs/plans/pricing/promos/campaigns) | **Yes** | Live mutations — treat as production config tools |
| Billing Stripe readiness | **Yes** | Read-only ops |
| Billing analytics EUR figures | **No as P&amp;L** | Credits KPIs yes; revenue/margin notional |
| Studio Finance | **Yes** | Wallet liability SoT |
| Users billing grants | **Yes** | High privilege |
| Render Analytics + CSV | **Yes** | Heavy query; monitor perf at scale |
| Studio Profitability (CBE revenue) | **Yes with caveat** | Understates Studio wallet monetization |
| Vidu credits card | **Yes** | External API dependency |
| Health cards | **Yes** | Non-financial |
| AI Lab Replicate | **Lab** | Not financial SoT |
| Promo-codes API | **API only** | No UI |
| ATU monitoring | **Missing** | — |
| GenerationJob admin | **Missing** | — |
| Alerts/cron | **Missing** | — |

---

## Reliability grades

| Class | Grade | Reason |
|-------|------:|--------|
| Wallet aggregates | A | Direct Prisma SoT |
| Catalog CRUD | A | DB-backed |
| Stripe readiness | A− | Env/DB dependent |
| PCE COGS analytics | B+ | Gaps/estimates labeled; dual events possible |
| CBE revenue analytics | B | Correct for quote path; incomplete for wallet Studio |
| Billing “grossRevenueEur” | **D** | Unit error vs commercial EUR |
| Cross-narrative margins | C | Easy to misread without SoT labels |

---

## Security / privilege

- All financial admin APIs: `requireAdmin()`  
- Grant/remove credits: irreversible ledger mutations  
- Pricing/pack/plan edits: commercial impact  
- No separate “finance-readonly” role found  

---

## Performance / scale risks

- `getRenderAnalyticsReport()` is a large multi-query compose — may slow as PCE/CBE grow  
- Studio Finance loads all matching usage ledger rows into memory for aggregation  
- Billing analytics pack loop `take: 500` recent purchases — not full history  

---

## Readiness for S.8E

Admin Center is **production-usable for catalog, wallet ops, Stripe readiness, and COGS analytics**.  
It is **not** yet a trustworthy single-pane commercial EUR P&amp;L without fixing Billing analytics revenue and labeling Wallet vs CBE vs PCE.

S.8E should **consolidate and correct**, not expand surface area.

---

## Status

**PASS**
