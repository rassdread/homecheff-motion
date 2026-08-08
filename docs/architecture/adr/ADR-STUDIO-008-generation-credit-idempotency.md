# ADR-STUDIO-008 — Generation Credit Idempotency

**Status:** Accepted  
**Date:** 2026-08-08  
**Phase:** S.4

## Decision

1. Idempotency key unique per owner prevents duplicate job creation.  
2. `chargeFinalized` ensures a job records at most one successful capture.  
3. Retry of a paid attempt requires a **new** idempotency key.  
4. Storage failure after provider success marks `STORAGE_FAILED` without clearing charge state / without automatic regenerate.

## Reservation

Keep existing authorize→capture/refund; do not invent a second financial model in S.4.
