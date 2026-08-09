# S.8B — Financial Security

| Attack | Result |
|--------|--------|
| Random paid idempotency key | Removed (code + tests) |
| Forged productionReservationId | 403 `FORGED_PRODUCTION_RESERVATION` (code / gate) |
| Forged productionTransactionId | Existing validator |
| Duplicate Stripe pack webhook | Preview PASS — single grant; replay NO-OP |
| Parallel Auto Top-Up | Preview PASS — unique attempt key → `already_pending` |
| localStorage credits | Non-authoritative (StudioWallet SoT) |
| Admin bypass | Preserved + auditable reason `admin_bypass` |
| LIVE Checkout creation without consent | Blocked by opt-in + plan eligibility |
| Enable without consent | Preview PASS — `CONSENT_REQUIRED` |
| Stripe mode mix (LIVE price + TEST key) | Fail-closed (`assertConfiguredStripePriceMatchesKeyMode`) |
| Declined TEST payment | Preview PASS — no credit grant |

## Preview security notes (2026-08-09)

- Deployment `dpl_AopEUX8ec2oySqrptgUUsDMQXvNQ` Ready on `c5adca81`
- Preview Stripe TEST; Production Stripe LIVE (no TEST bleed intended)
- Webhook delivery via `stripe listen` → Preview webhook with Vercel protection bypass (TEST only)
- Controlled cert user only on shared DB
- ATU disabled after certification; unpaid sessions expired
