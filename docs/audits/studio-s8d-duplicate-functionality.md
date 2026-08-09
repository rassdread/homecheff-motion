# S.8D — Duplicate Functionality

**Date:** 2026-08-10 · **Read-only**

Rule: do **not** propose new dashboards that recreate these.

---

## Confirmed duplicates / overlaps

| Topic | Surface A | Surface B | Relationship | Recommendation |
|-------|-----------|-----------|--------------|----------------|
| Wallet finance snapshot | `/admin` StudioFinanceCard | `/admin/studio-finance` | Card is subset | Keep both; card = teaser |
| Billing analytics KPIs | `/admin/billing` overview | `/admin/billing/analytics` | Same API twice | Keep analytics page; overview can stay summary |
| Credits sold/spent/granted | Billing analytics | Studio Finance | Overlapping wallet aggregates | Different emphasis (commercial vs liability); **label SoT** |
| Provider cost totals | Studio Finance (ledger) | Render Analytics (PCE) | **Different sources** — look like duplicates but diverge | Document as parallel; prefer PCE for COGS |
| Negative margin alerts | Studio Finance (ledger marginEstimate) | Profitability section (PCE/CBE) | Parallel alert concepts | Do not add third alert UI |
| Top costly users | Studio Finance | Profitability top cost users | Overlap | Prefer profitability for COGS-ranked; finance for credit-ranked |
| MRR / plan mix | Billing analytics | Profitability subscription simulation | Related but not identical | Billing = actual subs; profitability = what-if |
| Revenue | Billing analytics “grossRevenueEur” | Render CBE revenue | **False twin** | Billing figure is notional; CBE is quote EUR; pack Stripe EUR missing |
| Stripe price IDs | Billing Stripe page | Subscriptions/packs editors | Complementary | Not duplicate |
| Export paths | `/admin/render-analytics/export` | `/api/admin/render-analytics/export` | Legacy twin | Prefer page route; deprecate API later |
| User credit grant | `/users/[userId]` | Orphan `/billing/users` POST | API duplicate | UI uses [userId] only |
| Vidu credits | VideoCreditsCard | Render balance snapshots | Partial overlap | Card = live balance; snapshots = history |

---

## Not duplicates (often confused)

| Confusion | Reality |
|-----------|---------|
| “We need a margin dashboard” | **Exists** — Render Analytics → Studio Profitability + Pricing catalog margins |
| “We need wallet admin” | **Exists** — Studio Finance + Users billing + Billing overview |
| “We need Stripe admin” | **Exists** — `/admin/billing/stripe` |
| “We need pack/plan admin” | **Exists** — billing sub-pages |
| “We need provider cost export” | **Exists** — CSV sections |
| “We need credit pricing editor” | **Exists** — `/admin/billing/pricing` |

---

## Pseudo-duplicates to avoid in S.8E

Do **not** build:

1. New “Studio P&amp;L” page that re-aggregates wallet + PCE without fixing EUR SoT  
2. Second pricing catalog  
3. Second Stripe readiness page  
4. Second CSV exporter for the same PCE sections  
5. “Credits analytics” that copies Studio Finance metrics  

---

## Status

**PASS** — duplicates catalogued for anti-build guidance.
