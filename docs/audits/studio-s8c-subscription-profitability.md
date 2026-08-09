# S.8C — Subscription Profitability

**Date:** 2026-08-09 · **Read-only** · No pricing changes

---

## Product law (proven)

Subscriptions grant **privileges**, not monthly credit pools:

- `monthlyCredits: 0` for free / creator / pro / studio / enterprise  
- `invoice.paid` does **not** mint wallet credits  
- `creditDiscountPercent` reduces **action** credit cost only  
- Pack EUR prices are **not** discounted by plan (ATU honesty)

Sources: `studio-plan-config.ts`, `stripe-billing.ts` Phase 4 comment, S.8A subscription audit.

---

## Plan P&amp;L skeleton

| Plan | Sub income | Discount | ATU | Storage cost* | Credit liability |
|------|-----------:|---------:|:---:|---------------|------------------|
| Free | €0 | 0% | no | 1 GB | Pack/promo only |
| Creator | €7.99 / €79.90 y | 10% | yes | 5 GB | Pack/promo only |
| Pro | €24.99 / €249.90 y | 15% | yes | 25 GB | Pack/promo only |
| Studio | €79.99 / €799.90 y | 20% | yes | 100 GB | Pack/promo only |
| Enterprise | custom | 25% | yes | unlimited | Pack/promo + contracts |

\* Blob storage COGS not fully allocated per plan in wallet math; observed blob ≪ generation COGS.

---

## Scenarios

### Best case (subscriber, light usage)

- Income: subscription fee  
- Provider spend: ≈ $0  
- **Gross on fee ≈ 100%** (minus Stripe fees / support — not modeled in registry)  
- Pack margin unused  

### Normal case

- Income: fee + occasional pack_500/1250  
- Usage discounted 10–20%  
- Pack burn margin ≈ 67–81% depending on pack + mix  
- Discount leakage on scene: €0.019–0.037 per scene @ pack_8000 unit — **fee covers hundreds–thousands of scenes** before leakage equals fee  

### Heavy user

- Income: fee + large packs / ATU  
- Provider spend dominates absolute $  
- Effective portfolio margin still ~60–75% at registry actuals  
- ATU amplifies pack volume, not unit destruction  

### Worst case

- Enterprise 25% + pack_8000 + thin actions (premium_vision, 15-cr fusion, clone)  
- Premium vision → **11–29%** margin  
- Fusion 15→12 cr → **~51%** LOW_MARGIN  
- Clone +10–20% provider shock → below 60%  
- Promotional grants stacked → negative on grant burn  

---

## Break-even (discount leakage vs fee)

Using scene_generation (30 → discounted) and pack_8000 €/credit:

| Plan | Leak €/scene | Break-even scenes |
|------|-------------:|------------------:|
| Creator | 0.0187 | ~426 |
| Pro | 0.0250 | ~1000 |
| Studio | 0.0375 | ~2134 |

“Break-even” here means: scenes needed for **forgone credit revenue** to equal monthly fee. Sub remains profitable earlier because fee is cash-in with no credit mint.

---

## Margin sensitivity

| Lever | Effect on sub profitability |
|-------|-----------------------------|
| +provider COGS 20% | Pack margins drop ~6 pts; fee unchanged |
| +provider COGS 50% | Formula actions → LOW_MARGIN on pack_8000; fee still cushions light users |
| Higher discount (enterprise) | More generations / pack €; thin actions riskier |
| Yearly prepay | Cash timing benefit; same unit economics |
| ATU enable | More pack revenue + COGS; fee stickiness ↑ |
| Promo grants | Dilutes until purchased packs catch up |

---

## Average wallet behaviour (inferred from code, not telemetry)

| Behaviour | Mechanism |
|-----------|-----------|
| Free user | Must buy packs or stop at gate |
| Paid plan | Discount + ATU eligibility; still prepaid |
| Spend order | Promotional balance before purchased |
| Cancel | Credits retained (`applySubscriptionCancellationPolicy`); status prepaid |

No live cohort averages in this audit — only mechanism truth.

---

## Verdict

| Plan | Profitability posture |
|------|------------------------|
| Free | Pack-only; healthy if packs sold |
| Creator | Strong: fee + mild discount |
| Pro | Strong |
| Studio | Strong; watch heavy fusion/vision mix |
| Enterprise | Custom fee must cover 25% discount + unlimited storage narrative |

**Subscriptions are structurally high-margin** because they do not include monthly credits. Risk concentrates in **usage discount × thin SKUs**, not in the subscription SKU itself.

---

## Status

**PASS**
