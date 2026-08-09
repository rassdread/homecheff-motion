# Studio Financial Idempotency (S.8B)

## Law

Accidental duplicate request ≠ automatic second charge.

## Generation keys

Prefer: `Idempotency-Key` header or `clientMutationId`.  
Legacy: deterministic `operationFingerprint` (SHA-256) — **never** `Date.now()` / `Math.random()`.

## Pack purchase

`checkout.session.completed` grants credits only once per `stripeSessionId` (ledger metadata lookup).

## Auto Top-Up

Unique `(userId, idempotencyKey)` on `StudioAutoTopUpAttempt`.
