# ADR-STUDIO-007 — Provider Adapter Boundary

**Status:** Accepted  
**Date:** 2026-08-08  
**Phase:** S.4

## Decision

All provider SDKs are called only through server-side adapters implementing `StudioGenerationProviderAdapter`.

Client never imports providers or sets charged cost.

## Consequences

- Capability registry maps product intent → actionType + default adapter
- Fake adapter enables CI without provider spend
