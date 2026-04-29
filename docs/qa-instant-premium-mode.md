# Instant Premium mode switch QA

## Test mode (`INSTANT_PREMIUM_MODE=test`)

- Final button label shows: `Generate video (test mode)`.
- Click final button and verify no Stripe redirect occurs.
- Confirm request goes to `/api/instant-premium/create-and-generate` (not `/checkout`).
- Confirm response includes `projectId` and `status: "started"`.
- Confirm redirect to `/animate?resume=<projectId>`.
- Confirm logs include:
  - `[hc-instant-premium]`
  - `mode: "test"`
  - `action: "generate_without_payment"`
  - `jobTriggered: true|false`

## Paid mode (`INSTANT_PREMIUM_MODE=paid`)

- Final button label shows: `Pay €1.99 → Generate video` (or `€2.99`).
- Click final button and verify request goes to `/api/instant-premium/checkout`.
- Stripe checkout opens when `STRIPE_SECRET_KEY` is configured.
- If Stripe key is missing, user sees friendly message:
  - `Payment is temporarily unavailable.`
- Confirm logs include:
  - `[hc-instant-premium]`
  - `mode: "paid"`
  - `action: "stripe_checkout"`

## Safety checks

- `/api/instant-premium/create-and-generate` returns `409` in paid mode.
- `/api/instant-premium/checkout` returns `409` in test mode.
