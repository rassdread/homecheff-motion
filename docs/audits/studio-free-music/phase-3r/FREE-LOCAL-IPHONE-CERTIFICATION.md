# Phase 3R — FREE_LOCAL iPhone Certification

**FREE_LOCAL_IPHONE = PASS**

**Date:** 2026-08-30  
**Production:** `dpl_CrWqFNE7qtvA7FK9gH3dnGfbC3Rz`  
**Clean evidence:** `iphone-exports/iphone-free-music-export-clean.mp4`  
**AirDrop as received:** `~/Downloads/homecheff-video 4.mp4` → copied to canonical clean name

## Prior silent export

`iphone-exports/iphone-free-music-export.mp4` remains **INVALID_FOR_AUDIO_CERTIFICATION**  
(`CERT_AUTOMATION_VOLUME_SCALE_ERROR`) — **not** used for this PASS.

## Result matrix

| Check | Verdict |
|---|---|
| Valid MP4 | PASS |
| H.264 video 404×720 | PASS |
| AAC audio stream | PASS |
| FREE_LOCAL Mediabunny | PASS |
| Duration ~15s | PASS |
| Non-zero audio energy | **PASS** (RMS full ≈ 0.094; windows 0.069–0.114) |
| Free Music audible | **PASS** |
| Distinct from silent export | PASS (355807 vs 47993 bytes) |

## Audio proof

- peakAbs ≈ 0.70  
- nonzeroRatio ≈ 0.995  
- AAC ≈ 117 kbps (vs silent export ≈ 2 kbps)

Threshold: RMS > 0.001 (Chromium/Safari catalog baseline ≈ 0.13).

## Remaining before 5→55

`IPHONE_PROJECT_SAVE_REOPEN` still needs **offset** persistence PASS (track + volume already PASS on clean project).
