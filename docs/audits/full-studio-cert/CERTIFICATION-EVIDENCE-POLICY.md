# Studio Full Product — Certification Evidence Policy

**Effective:** 2026-08-26  
**Scope:** Targets A (Audio), B (Automatic final video merge), C (Physical iPhone Advanced)

This document is binding for all certification runs, verdict labels, and code changes tied to Studio full-product closure.

---

## A. iPhone orientation evidence

On physical iPhone Safari, **do not** treat `screen.orientation.type` as the sole source of truth.

Use a **combined physical-orientation proof**:

| Signal | Role |
|--------|------|
| `window.innerWidth` / `window.innerHeight` | Primary viewport dimensions |
| `visualViewport.width` / `height` | Where available |
| `matchMedia("(orientation: portrait)")` | Media-query orientation |
| `matchMedia("(orientation: landscape)")` | Media-query orientation |
| `screen.orientation.type` | Secondary — use when reliable |
| Rendered Studio layout | Stage nav / project context visible |

**PASS** may be established when the physical device is visibly portrait and viewport evidence proves portrait, **even if** Safari exposes stale or inconsistent `screen.orientation` metadata.

- Document any Safari reporting discrepancy explicitly in gate evidence (`safariOrientationDiscrepancy`, `safariDiscrepancyNote`).
- Do **not** invalidate previously certified portrait/landscape behavior because of one stale inspector field.
- Implementation: `scripts/lib/full-studio-cert-orientation-proof.ts`

---

## B. Target B — do not certify merge only

Target B certification requires the **complete automatic chain**:

```
merge → local final file → upload → persisted finalVideoUrl
  → completed version → playable final result
```

| Evidence | Sufficient for CERTIFIED? |
|----------|---------------------------|
| Successful FFmpeg output alone | **No** |
| Rebuild-only success | **No** (recovery evidence only) |
| GET `/status` → completed + DB + HEAD playable | **Yes** |

Script: `scripts/_full-studio-cert-auto-merge.ts` (GET `/status` only; forbidden rebuild/repair POSTs).

---

## C. First-divergence rule

When comparing automatic finalization with rebuild:

1. **Do not patch based on hypothesis.**
2. First prove the **earliest concrete divergence**, e.g.:

| Automatic | Rebuild |
|-----------|---------|
| local file exists | local file exists |
| upload helper called | same/different upload helper |
| storage returns failure | storage succeeds |

3. Only after that evidence should code be modified.

See also: `MERGE-70PCT-ROOT-CAUSE.md`.

---

## D. Shared primitive acceptance

If automatic and rebuild are consolidated onto `finalUploadAndPersist(...)` (or equivalent canonical name):

- Prove **both paths call the same implementation** in tests.
- Do not merely create helpers with similar logic.
- One canonical implementation for:
  - output validation
  - upload
  - persistence
  - version finalization
  - cleanup ordering
- Path-specific orchestration stays **outside** the primitive.

Current tests: `src/server/instant-premium/final-upload-persist.test.ts` (asserts shared `uploadMergedVideoToBlob` + `commitInstantPremiumFinalVideoExport` + `runFinalExportToCompletion`).

---

## E. Production certification = normal path only

Final Target B certification must **not** invoke any of:

- `rebuild-final-video`
- direct worker invocation
- internal diagnostic worker
- manual finalization
- DB mutation that directly sets `finalVideoUrl`
- storage upload performed manually

**Normal application behavior only.**

---

## F. Final state labels

| Condition | Verdict |
|-----------|---------|
| Target A + B + C all **CERTIFIED**, and mandatory regression / build / typecheck / billing / version checks pass | `STUDIO_FULL_PRODUCT_CERTIFIED` |
| Any blocker remains or checks fail | `STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED` |

**No intermediate label** may be interpreted as full certification.

---

## Current status (2026-08-26)

| Target | Status | Blocker |
|--------|--------|---------|
| A — Audio | CERTIFIED | — |
| B — Automatic merge | WORKING | Upload failure on normal GET `/status` path; rebuild succeeds (~23s) but is recovery-only |
| C — iPhone Advanced | PARTIAL | ORIENTATION_RECOVERY; prior PORTRAIT + LANDSCAPE preserved |

**Verdict:** `STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED`
