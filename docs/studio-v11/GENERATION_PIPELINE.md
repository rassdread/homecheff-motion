# Generation pipeline

Manual UI and the future director must share this path. There is no second generation backend.

```
quote (pricing rule + duration/units)
→ user approval (explicit)
→ authorizeStudioAction
→ reserveStudioCredits (creditReservationId)
→ provider adapter
→ persist asset on the owning scene or animation project
→ captureStudioActionReservation
   or refundStudioActionReservation on failure
→ StudioGenerationJob status
```

## What is already true

- `StudioGenerationJob` stores capability, provider, status, reservation id, credits reserved and charged, and `chargeFinalized`.
- Image and motion routes are owner-scoped.
- Character-master generation has its own confirm and a locked request body.
- Voice preview has an explicit paid confirmation.
- Idempotency keys exist on jobs.

## What is not uniformly true

- Not every button shows a quote before the reserve. Voice preview does. Some render actions reserve inside the API as soon as the route is called.
- A director tool that called those routes directly would spend HC without a second confirmation. The director must stop at the quote.
- Kling and Runway are not adapters. Do not add them as director tools until an adapter and a price rule exist.
- Failure refund exists as `refundStudioActionReservation`. Whether every adapter calls it on timeout needs a test in the implementation phase. Do not assume it.

## Jobs

Poll existing job status. Do not start a provider job from the audit. The director’s job view should read `StudioGenerationJob` and the animation transition status the video page already polls.
