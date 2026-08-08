# ADR-STUDIO-001 — Client / Server Boundaries

**Status:** Accepted (S.1)  
**Date:** 2026-08-08

## Context

S.0 found client graphs reaching server modules through `src/lib` (credits, audio blob/`node:crypto`).

## Decision

1. Classify modules as CLIENT_SAFE / SHARED_PURE / SERVER_ONLY.
2. SHARED_PURE holds constants/types/pure helpers only.
3. Blob I/O, Prisma, provider SDKs, and credential access live under `src/server`. Prefer documenting `SERVER_ONLY` and architecture denylist tests (this repo’s `tsx` test runner cannot load the `server-only` package without a shim).
4. Architecture tests deny known leak import paths from `"use client"` files.

## Consequences

- Safer browser bundles; clearer ownership.
- Some `src/lib` modules remain server-leaning — migrate gradually, do not big-bang move.
