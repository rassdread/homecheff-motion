# Studio S.6E — Canonical Prompt Matrix Implementation Audit

**Date:** 2026-08-09  
**Branch:** `feat/studio-s6e-prompt-matrix`  
**Docs baseline:** `3cee073b` (`docs(studio): freeze product truth and continuity contracts`)

## Scope delivered

| Slice | Status |
|-------|--------|
| S.6E.1 Types + ContinuityBundle + CreativeSpecification | DONE |
| S.6E.2 Scene still wrapper + OpenAI transform | DONE |
| S.6E.3 Option maps + duration/aspect resolution | DONE |
| S.6E.4 Fusion wrapper | DONE (wrap; legacy Fusion authoritative) |
| S.6E.5 Vidu / Instant / Motion wrapper | DONE (wrap + continuity cases) |
| S.6E.6 Voice / audio mapping | DONE (mapping only) |
| S.6E.7 BrandKit + PromptPreset overlays | DONE (honest optional) |
| S.6E.8 Experience registry + compliance | DONE (canonical set, not 200 builders) |
| S.6E.9 Regression tests + docs | DONE (unit/CT/option/golden); Preview/Prod pending cert |

## Absolute rules respected

- Continuity owns identity; Matrix assembles; Transform last
- `studio-prompt-builder` retained (wrapped)
- Fusion / Vidu / Instant logic not deleted
- BrandKit / PromptPreset not faked as always-on
- Runtime providers only: OpenAI, Vidu, ElevenLabs, mock
- Scene T2I pixel conditioning remains **PARTIAL**

## Intentional prompt behavior

Scene still Matrix wrap returns **byte-equivalent** `builderOutput.prompt` vs direct `buildScenePromptFromInput` (golden-master test). No quality rewrite in S.6E.

## Known non-blocking risks

- Many experiences remain `MATRIX_PARTIAL` / `LEGACY_UNMIGRATED`
- Instant standalone paths still source-image continuity only (by design)
- Preview / Production certification not completed in this audit file until deploy smoke

## Decision for S.6F

See final report after gates + Preview. Default until Preview GREEN: **NO-GO FOR S.6F**.
