# Studio Auto Top-Up (S.8B)

## Runtime truth

| Phase | State |
|-------|--------|
| Before S.8B | `CONFIG_ONLY` (`autoTopUpAvailable` on plan only) |
| After S.8B | Opt-in user settings + idempotent checkout attempt |

## Contract

- `enabled` + explicit `consent`
- `thresholdCredits` (informational; trigger is **action needs more credits than available**)
- `topUpPackId` (same catalog as manual packs)
- `maxAttemptsPerHour` (technical duplicate protection = 3)
- Idempotency key: `auto_topup:{userId}:{packId}:{UTC_hour}`

## Trigger

```
availableCredits < requiredCredits
AND enabled + consent
AND plan.autoTopUpAvailable
AND within hourly attempt limit
```

Creates **Stripe Checkout** for the configured pack (same as manual) — not a silent off-session charge. SCA handled by Stripe Checkout.

## API

- `GET/PATCH/POST /api/me/studio-credits/auto-topup`

## Discount parity

Manual pack and Auto Top-Up use `createCreditPackCheckout` — same EUR pack price / promo path. Plan `creditDiscountPercent` continues to discount **usage** credit costs, not invent separate Auto Top-Up EUR pricing.
