# Studio Billing Foundation (S.8B)

**Status:** LIVE foundation hardening  
**Frozen Product Truth:** S.8A (`9dc255fb`)  
**No price / margin / monthly credit grant changes**

## Ownership

| Owner | Responsibility |
|-------|----------------|
| Billing | Stripe, packs, subscriptions, Auto Top-Up payment execution |
| Credits | Wallet reserve/capture/refund/ledger |
| GenerationJobs | Lifecycle, idempotency, chargeFinalized |
| Providers | SDK execution |
| Telemetry | ProviderCostEvent / ProviderUsageLog |

## Commercial model (locked)

- Prepaid StudioWallet
- `monthlyCredits = 0`
- Plan discounts apply to **action credit cost** (`creditDiscountPercent`)
- Pack EUR prices shared by manual + Auto Top-Up checkout (parity)

## Auto Top-Up

Runtime before S.8B: **CONFIG_ONLY**  
After: opt-in settings + idempotent checkout attempt via same pack path — see `studio-auto-topup.md`
