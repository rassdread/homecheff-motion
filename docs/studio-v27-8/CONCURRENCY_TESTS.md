# Concurrency

The existing worker admits one film render at a time. A second film stays `queued` and starts when the first finishes. Marketplace and instant-premium handlers were not changed. A film waits if one of those renders is already in `RUNNING`.

Two synthetic exports were posted together for two different users. The immediate statuses were `processing` and `queued`. Both later succeeded with different library assets and different owners. Both wallets stayed at 500. The worker health check after the pair was HTTP 200.

The picture length of that pair was 3 seconds (three 1-second scenes). It was a concurrency test, not a duration test.

Safe film concurrency on this worker: 1.
