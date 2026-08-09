# S.8B — Financial Security

| Attack | Result |
|--------|--------|
| Random paid idempotency key | Removed |
| Forged productionReservationId | 403 FORGED_PRODUCTION_RESERVATION |
| Forged productionTransactionId | Existing validator |
| Duplicate Stripe pack webhook | Single grant |
| Parallel Auto Top-Up | Unique attempt key |
| localStorage credits | Non-authoritative (StudioWallet SoT) |
| Admin bypass | Preserved + auditable reason `admin_bypass` |
