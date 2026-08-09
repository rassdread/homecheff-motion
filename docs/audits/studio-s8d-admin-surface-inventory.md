# S.8D — Admin Surface Inventory

**Date:** 2026-08-10 · **Read-only** · **HEAD:** `0e8fe056fd1374ec77563efa8b92dc8e39a9ac4f`

---

## Complete financial/ops inventory

| Route / surface | Purpose | Data source | SoT class | Update | Owner module | Completeness | Reliability | Prod readiness |
|-----------------|---------|-------------|-----------|--------|--------------|--------------|-------------|----------------|
| `/admin` dashboard | Hub + cards | Multiple APIs | Mixed | On demand | page + cards | Partial nav | Med | Ready |
| StudioFinanceCard | Snapshot wallet finance | `/api/admin/studio-finance` | Wallet A | On demand | `studio-finance-analytics` | Duplicate of full page | High (wallet) | Ready |
| `/admin/studio-finance` | Full wallet finance | same | Wallet A | On demand | same | Good for credits | High | Ready |
| `/admin/billing` | Overview wallets + analytics + policy | `/billing` + `/billing/analytics` | Wallet A + **EUR caveat** | On demand | billing admin services | Good | Med (EUR) | Ready w/ caveat |
| `/admin/billing/pricing` | Action credit catalog | pricing APIs + DB rules | Catalog | On demand | pricing rule service | Good | High | Ready |
| `/admin/billing/subscriptions` | Plan catalog + ATU flag | subscriptions API | Catalog | On demand | plan service | Good | High | Ready |
| `/admin/billing/credit-packs` | Pack catalog | credit-packs API | Catalog | On demand | pack service | Good | High | Ready |
| `/admin/billing/promotions` | Promo CRUD | promotions API | Catalog | On demand | promotions | Codes via POST; no dedicated codes UI | Med | Ready |
| `/admin/billing/campaigns` | Grants + carry policy | campaigns API | Policy | On demand | billing policy | Good | High | Ready |
| `/admin/billing/stripe` | Stripe readiness | stripe readiness service | Ops | On demand | stripe readiness | Good | High | Ready |
| `/admin/billing/analytics` | MRR/credits/revenue/margin | `loadBillingAnalytics` | Wallet A + **false EUR** | On demand | billing analytics service | Incomplete EUR | **Low for EUR** | Ready for credits; **not** for EUR P&amp;L |
| `/admin/users` + billing panel | Roles + wallet grant/ledger | users + billing/users/[id] | Wallet A | On demand | billing admin | Good per-user | High | Ready |
| `/admin/render-analytics` | Master COGS/usage/profit/CSV | Prisma PCE/CBE/usage/storage + Vidu | B + C | SSR + refresh | `render-analytics` + siblings | Broadest | Med–High (gaps labeled) | Ready |
| Export CSV | Download sections | same report | B + C | On download | csv builder | Good | High | Ready |
| VideoCreditsCard | Vidu balance | Vidu API | Provider balance | On demand | video/credits | Single metric | High | Ready |
| Health cards (OCR/vision/overlay/storage) | Ops health | various | Non-money | On demand | health modules | N/A finance | Med | Ready |
| `/admin/ai-lab/replicate` | Replicate probe | AI lab APIs | Provider lab | On demand | replicate lab | Not wallet | Med | Lab only |
| Instant Premium admin APIs | Brand QA / motion-lock | IP tables | Adjacent | On demand | IP routes | Outside Billing Center | Med | Partial |
| CLI profitability-audit etc. | Offline reports | code registries / Prisma | Audit | Manual | scripts | No UI | High for code audit | Dev/ops |

---

## Admin APIs (financial core)

| API | Methods | UI | Orphan? |
|-----|---------|----|---------|
| `/api/admin/billing` | GET | billing overview | no |
| `/api/admin/billing/analytics` | GET | billing overview + analytics | no |
| `/api/admin/billing/stripe` | GET | stripe page | no |
| `/api/admin/billing/credit-packs` | GET PATCH | credit-packs | no |
| `/api/admin/billing/subscriptions` | GET PATCH | subscriptions | no |
| `/api/admin/billing/pricing` (+ `[actionType]`, sync-defaults) | GET PATCH POST | pricing panel | no |
| `/api/admin/billing/promotions` | GET POST PATCH | promotions | no |
| `/api/admin/billing/promo-codes` | GET POST PATCH | **none** | **yes** |
| `/api/admin/billing/campaigns` | GET PATCH | campaigns | no |
| `/api/admin/billing/users` | GET PATCH POST | **none** (collection) | **yes** |
| `/api/admin/billing/users/[userId]` | GET POST | users panel | no |
| `/api/admin/studio-finance` | GET | card + page | no |
| `/api/admin/render-analytics` | GET | render-analytics | no |
| `/api/admin/render-analytics/export` | GET | **legacy** | prefer page export |
| `/admin/render-analytics/export` | GET | dashboard downloads | no |
| `/api/admin/video/credits` | GET | dashboard card | no |

---

## Non-financial admin (listed for filter)

| Route | Finance relevance |
|-------|-------------------|
| `/admin/invites` | None |
| `/admin/examples` | None |
| Library consistency panel | Ops integrity |
| Editor audit APIs | Creative QA, not money |

---

## Status

**PASS** — inventory complete for S.8D scope.
