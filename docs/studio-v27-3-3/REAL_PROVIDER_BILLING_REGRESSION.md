# Real provider billing regression

File: `src/server/studio/studio-mock-billing-isolation.db.test.ts`

Database: `homecheff_film_cert_2u` on `127.0.0.1:5432`. Result: 1 passed, 0 failed. `OPENAI_API_KEY` was unset. The paid cases call `billProviderAction` with an in-process stub. The stub does not call a provider.

`scene_generation` price remains 30 HC and provider `openai`.

Simulated paid success, wallet started at 80:

- stub ran once
- `billing.captured` true
- `estimatedCredits` 30
- balance 50
- reserved balance 0
- lifetime spent 30
- one `usage_capture` row, provider `openai`, delta `-30`

Simulated paid failure (`isFailure` true), a separate wallet started at 80:

- stub ran once
- `billing.captured` false
- balance 80
- reserved balance 0
- lifetime spent 0
- zero `usage_capture` rows
- one `failed_generation_refund` row

A second `captureStudioCredits` for the same reservation id did not add a second capture and left the success wallet at 50.

The authorized mock image path, on another user, wrote a completed `file://` image with provider `mock` and left that wallet at 500 with zero ledger rows.
