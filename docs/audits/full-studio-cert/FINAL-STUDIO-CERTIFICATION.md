# Final Studio Certification

**Date:** 2026-08-26  
**Latest repair:** `5ac94c7c` on `main`  
**Evidence policy:** [CERTIFICATION-EVIDENCE-POLICY.md](./CERTIFICATION-EVIDENCE-POLICY.md)

## Verdict

```
STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED
```

## Why BLOCKED

1. **Target B** — `AUTOMATIC_FINAL_VIDEO_MERGE = WORKING`. First divergence proven: **H6** legacy `final.mp4` collision on automatic re-finalization. Fix `32abbba2` on Vercel; **Render worker redeploy required** for certification. See [TARGET-B-FIRST-DIVERGENCE.md](./TARGET-B-FIRST-DIVERGENCE.md).
2. **Target C** — `PHYSICAL_IPHONE_ADVANCED = PARTIAL`. ORIENTATION_RECOVERY still FAIL when Safari viewport remains landscape (`800×301`) after USB reconnect. Prior PORTRAIT + LANDSCAPE PASS preserved. Addendum A orientation proof now uses combined viewport evidence; stale `screen.orientation` alone does not invalidate prior gates.

## Target matrix

| Target | Status |
|--------|--------|
| A — Audio | CERTIFIED |
| B — Automatic final video merge | WORKING |
| C — Physical iPhone Advanced | PARTIAL |

## Full certification gate (addendum F)

Emit `STUDIO_FULL_PRODUCT_CERTIFIED` only when:

- Target A, B, and C are all **CERTIFIED**
- Mandatory regression / build / typecheck / billing / version checks pass

Until then: **`STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED`** — no intermediate label counts as full certification.
