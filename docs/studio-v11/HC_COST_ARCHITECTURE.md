# HC cost architecture

## What the code does

| Step | Status |
|---|---|
| Wallet per account | `StudioWallet` |
| Pricing catalog | `StudioPricingRule` |
| Reserve before provider | `authorizeStudioAction` → `reserveStudioCredits` |
| Reservation id on the job | `StudioGenerationJob.creditReservationId` |
| Capture | `captureStudioActionReservation` |
| Refund | `refundStudioActionReservation` → `refundStudioReservation` |
| Ledger | `StudioLedgerEntry` |
| Central release helper | `releaseCentralHc` in the HC adapter. Not verified as the path every Studio action uses |
| Explicit user quote | Present for voice preview and character-master generation. Not proven on every render button |
| Duplicate job prevention | `idempotencyKey` on the job. Not proven on every route |
| Assistant usage cost | Director wizard spends 0 HC because it does not call a model in that module. If a later chat calls a planner model, that call needs its own small quote |

## Target flow

1. User or director requests an action.
2. Server prices it from `StudioPricingRule` and returns units, HC, and a short-lived `quoteId`.
3. UI shows the quote. The director panel uses the same component.
4. User approves. Approval is a second request, not a sentence in the chat.
5. Server checks owner, project, and that the quote is unexpired and unused.
6. Server reserves HC.
7. Provider job starts.
8. Asset is stored on the scene or animation project.
9. Capture uses the actual units when the provider reports them. If the provider cannot report usage, capture the quote.
10. Failure before a usable asset refunds the reservation. A partial video segment that was stored is not silently deleted. The user keeps the file and the charge, and can delete later by an explicit action.

## Gaps to close before the director can spend

- One quote component for image, video, voice, music, and export.
- Server-side rejection of provider calls that arrive without `quoteId` + approval when the price is above zero.
- A test that a failed Vidu job refunds.
- A test that the same idempotency key does not reserve twice.
- No wallet writes in this audit.
