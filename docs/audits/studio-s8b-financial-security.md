# S.8B — Financial Security

| Attack | Result |
|--------|--------|
| Random paid idempotency key | Removed (code + tests) |
| Forged productionReservationId | 403 `FORGED_PRODUCTION_RESERVATION` (code) |
| Forged productionTransactionId | Existing validator |
| Duplicate Stripe pack webhook | Single grant (ledger `stripeSessionId` guard) |
| Parallel Auto Top-Up | Preview PASS — unique attempt key → `already_pending` |
| localStorage credits | Non-authoritative (StudioWallet SoT) |
| Admin bypass | Preserved + auditable reason `admin_bypass` |
| LIVE Checkout creation without consent | Blocked by opt-in + plan eligibility |
| Enable without consent | Preview PASS — `CONSENT_REQUIRED` |

## Preview security notes (2026-08-09)

- Deployment `dpl_8LJdHpA6L3KitqhoSxffsreBCidS` Ready on `8624b07d`
- Migration applied before Auto Top-Up API could read prefs
- No LIVE card payment completed during certification
