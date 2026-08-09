# S.8C — Credit Pack Profitability

**Date:** 2026-08-09 · **Read-only**

---

## Catalog (TS SoT / DB override)

| Pack | Credits | Bonus default | Purchase € | Effective €/credit | Stripe env |
|------|--------:|--------------:|-----------:|-------------------:|------------|
| pack_500 | 500 | 0 | 4.99 | 0.009980 | `STRIPE_PRICE_PACK_500` |
| pack_1250 | 1250 | 0 | 9.99 | 0.007992 | `STRIPE_PRICE_PACK_1250` |
| pack_3000 | 3000 | 0 | 19.99 | 0.006663 | `STRIPE_PRICE_PACK_3000` |
| pack_8000 | 8000 | 0 | 49.99 | 0.006249 | `STRIPE_PRICE_PACK_8000` |

Granted = `credits + bonusCredits` (+ promo pack bonuses when applied).

---

## Designed economics (formula burn)

Designed provider budget = `credits × USD_PER_CREDIT / CREDIT_MARGIN_MULTIPLIER` = `credits × 0.002` USD.  
FX = 1.08 for € cost conversion.

| Pack | Revenue € | Max designed provider $ | Cost € | Designed gross margin | vs TARGET 65% |
|------|----------:|------------------------:|-------:|----------------------:|:-------------:|
| pack_500 | 4.99 | 1.00 | 0.93 | **81.4%** | PASS |
| pack_1250 | 9.99 | 2.50 | 2.31 | **76.8%** | PASS |
| pack_3000 | 19.99 | 6.00 | 5.56 | **72.2%** | PASS |
| pack_8000 | 49.99 | 16.00 | 14.81 | **70.4%** | PASS |

Internal reserved value of pack credits = `credits × 0.005` USD (ledger notionals, not customer EUR).

---

## Loss / profit thresholds

| Threshold | Meaning |
|-----------|---------|
| Profit (designed) | Actual portfolio COGS ≤ designed budget (~$0.002/credit) |
| Target 65% | Max COGS ≈ 35% of pack € converted at FX |
| Loss | Average actual COGS € &gt; pack € (or thin-SKU mix dominates) |

**pack_8000** is the margin floor among packs (lowest €/credit). Prefer it for stress tests (`getWorstPackEurPerCredit`).

**pack_500** is best unit revenue and default **Auto Top-Up** pack — highest designed margin.

---

## Interaction with discounts

- Plan `creditDiscountPercent` does **not** change pack Checkout EUR.  
- It increases generations per purchased credit → **higher provider spend per pack €**.  
- Example: Creator 10% → ~11% more scene gens per pack → designed margin compresses toward ~67% on scene mix at pack_8000 (still SAFE at list COGS).

---

## Auto Top-Up behaviour

| Field | Value |
|-------|-------|
| Default pack | pack_500 |
| Threshold stored | 50 (not used as trigger) |
| Trigger | available &lt; required for action |
| Rate limit | 3 attempts / hour |
| Consent | required |
| Financial | Identical to manual pack purchase |

ATU **improves cash conversion** on shortage; unit pack profitability unchanged.

---

## Promotional / bonus dilution

| Mechanism | Effect on pack margin |
|-----------|----------------------|
| DB `bonusCredits` &gt; 0 | More credits / same € → margin ↓ |
| Promo `%` of base credits | Same |
| Separate PROMOTIONAL grant | Not a pack; 0€ revenue burn |

TS defaults `bonusCredits: 0` — verify production DB.

---

## Mix stress (pack_8000 €49.99 / 8000 cr)

| Burn mix | Provider $ (approx) | Margin @1.08 |
|----------|--------------------:|-------------:|
| All formula (actual=reserved) | 16.0 | 70.4% |
| All motion (450cr@$0.70 → 17.78 units) | ~12.4 | ~77% |
| All premium_vision (5cr@$0.024) | 38.4 | **negative** |
| All voice_clone | 20.0 | ~63% |

Premium vision can **destroy an entire pack margin** if it dominates consumption — primary pack risk SKU.

---

## Verdict

All four packs are **commercially healthy** under designed ×2.5 economics and typical Studio action mix.  
Largest pack has thinnest cushion. Auto Top-Up default (pack_500) is the **most protective** pack for HomeCheff unit economics.

---

## Status

**PASS**
