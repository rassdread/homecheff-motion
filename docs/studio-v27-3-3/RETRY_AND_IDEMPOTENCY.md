# Retry and idempotency

Same disposable database test as the billing regression.

Duplicate capture: after one successful `scene_generation` capture, `captureStudioCredits` was called again with the same reservation id. The wallet stayed at 50. `usage_capture` count stayed 1. That is the existing ledger guard in `captureStudioCredits`, which returns the existing row.

Generation retry: `createGenerationJob` with one idempotency key, then `runSynchronousGenerationJob`, then `createGenerationJob` again. The second result is `replay`. The second `runSynchronousGenerationJob` returns `replay: true` and does not call `executeBilled`. The execute counter stayed 1. The wallet was unchanged by the replay.

The image route still returns an existing succeeded job before billing when the idempotency key matches. The browser recertification posts the scene image, then posts it again for the same scene. That second response is the replay. Ledger delta for the fresh certification user is 0.

No second wallet accounting path was added.
