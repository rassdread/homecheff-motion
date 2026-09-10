# Scenario G — HomeCheff E2E (Authenticated Production)

**Classification:** `HOMECHEFF_E2E` → **WORKING**  
**Date:** 2026-08-22 (px4a5 re-run on Production)  

## Evidence

`docs/audits/px4a5-human-cert/live-report.json` (updated 2026-08-22)

## Flows

| Flow | Description | Status |
|------|-------------|--------|
| A | sell/new → photos → Quick Video → attach | **PASS** |
| B | Baseline attach | **PASS** |
| C | GAP2 cancel / keep / replace | **PASS** |
| D | 12 photos / 30s attach | **PASS** |
| E | Mobile 390px | **FAIL** (automation: duration chip not visible) |

## GAP2 existing-video protection (Flow C)

- **CANCEL:** old video remains → verified  
- **REPLACE:** new video only after explicit replace → verified  
- **Single listing video** after attach  

## Context gate

- Draft preserved, not published  
- Photos preserved  
- Handoff to `studio.homecheff.eu/studio/photo-video`  
- Return to listing with attached MP4 on Vercel blob  

## Advanced Studio HomeCheff attach

Not separately certified this slice (Quick Video contextual path is the supported attach flow).

## Classifications

| Area | Status |
|------|--------|
| HOMECHEFF_E2E | WORKING |
| EXISTING_VIDEO_PROTECTION | WORKING |
| QUICK_VIDEO_REGRESSION | WORKING |
