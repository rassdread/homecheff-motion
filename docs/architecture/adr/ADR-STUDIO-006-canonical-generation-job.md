# ADR-STUDIO-006 — Canonical Generation Job

**Status:** Accepted  
**Date:** 2026-08-08  
**Phase:** S.4

## Decision

Introduce additive Prisma model `StudioGenerationJob` as the product-level record for Studio generations.

## Consequences

- UI/status/resume use canonical job IDs
- Credits remain in existing wallet reservation APIs
- Legacy `StudioJob` bulk batch jobs remain temporarily with billed steps
