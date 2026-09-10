# Physical iPhone — Final Closeout

**Updated:** 2026-08-24T22:56Z  
**Evidence:** PHYSICAL Safari Web Inspector / CDP — not emulation  
**Provider calls:** **0**

## PHYSICAL_IPHONE_DETECTED = YES

| Field | Value |
|-------|-------|
| UDID | `00008030-000E38AE1EF8202E` |
| Name | Sergio’s iPhone |
| Product | iPhone12,1 |
| iOS | 26.3.1 |
| CDP | `127.0.0.1:9222` (ios_webkit_debug_proxy) |
| Safari tab | Production Studio storyboard `cmt5izwgu0001gq0444v3ipil` |

## Gate matrix

| Gate | Status | Evidence |
|------|--------|----------|
| PHYSICAL_IPHONE_ADVANCED | **PARTIAL** | recovery still FAIL on measured viewport |
| PORTRAIT | **PASS** | Prior r2 (preserved) |
| LANDSCAPE | **PASS** | Prior `800×301` landscape-primary (preserved) |
| ORIENTATION_RECOVERY | **FAIL** | USB reconnect measured **still landscape** `800×301` / `landscape-primary` for full 3 min wait |
| BLACK_PREVIEW_REGRESSION | **PASS** | preview 1024×1024 not black during recovery attempt |
| STAGE_NAVIGATION | **PASS** | preserved + Afronden reachable during attempt |
| SCENE_PERSISTENCE | **PASS** | preserved |
| FINISH_MOBILE | **PASS** | Afronden clickable on connected session |
| PROJECT_LIBRARY_MOBILE | **PASS** | preserved |
| SAFE_AREAS | **PASS** | preserved |
| TOUCH_INTERACTION | **PASS** | preserved |

Recovery attempt logs: `iphone-final/run-portrait-recovery-3.log`  
Shot: `iphone-final/*-portrait-recovery-final.png`  
Live: `IPHONE-FINAL-LIVE.json`

## Why recovery is not PASS

User reported portrait + USB reconnect. Device/Web Inspector session was live, but Safari viewport remained:

- width 800 / height 301
- `matchMedia(orientation: landscape) = true`
- `screen.orientation = landscape-primary`

Prior PORTRAIT + LANDSCAPE PASSes are **not** invalidated.

## Action for CERTIFIED Target C

Physically rotate until Safari reports portrait (`height >= width`, `portrait-primary`), keep Studio tab foreground, re-run recovery-only measurement.
