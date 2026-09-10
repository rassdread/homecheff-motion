# Pricing / Entitlements Audit

## Intended (audit brief) vs live (repo/Production)

| Plan | Brief intent | Live official (`studio-subscription-prices.ts` / terms/FAQ) |
|---|---|---|
| Creator | €15 / 750 HC | **€7.99/mo**; `monthlyCredits: 0` in plan config |
| Pro | €29 / 1,500 HC | **€24.99/mo**; monthlyCredits 0 |
| Studio | €79 / 4,000 HC | **€79.99/mo**; monthlyCredits 0 |

Subscriptions currently emphasize **storage + credit-pack discounts**, not included HC grants (Phase 4 credit policy comment in `studio-plan-config.ts`).

## Product problems

| Issue | Pri | Class |
|---|---|---|
| Brief vs live price/HC narrative mismatch (commercial strategy unclear to users) | P1 | COMMERCIAL / TRUST |
| Help copy still uses Creator €7,99 examples — OK if official; confusing if strategy moves to €15/750 | P1 | TRUST |
| Free users can create valuable Quick Video — **strength** | — | KEEP |
| AI Video / Animation credit gates exist — good; messaging must be pre-action | P2 | UX |
| Provider/model concepts must stay hidden | P1 | IA (providers page reachable) |

## Free vs paid clarity

| Path | Clear? |
|---|---|
| Quick Video free on device | Yes |
| When AI costs HC | Partial |
| What subscription buys | Partial (storage/discount vs “credits included”) |

**Status:** PARTIAL — commercial story needs one source of truth before freeze.
