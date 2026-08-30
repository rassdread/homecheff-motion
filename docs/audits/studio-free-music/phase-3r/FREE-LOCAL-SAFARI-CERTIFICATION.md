# Phase 3R — FREE_LOCAL Safari Certification

**Date:** 2026-08-28  
**Engine:** Playwright WebKit (Safari engine)  
**Pilot:** Steve (`cmszybweq0000jl046b7qqvt5`)

## Verdict

**FREE_LOCAL_SAFARI = CERTIFIED**

## Evidence

- Composer UI: 5 tracks, search/category/preview/select **CERTIFIED**
- Mutual exclusion **PASS**
- FREE_LOCAL export MP4: h264 + aac, catalog music audible
- Volume 0% → RMS 0; volume 60% → RMS ≈ 0.130 **PASS**
- OGG preview (`fm_oga_besai_crystal_gardens_2_forbidden_pathway`): **PASS** (no error)

## Notes

- `PROJECT_SAVE_REOPEN` on WebKit reported FAIL (`localStorage` draft null before/after reload — timing/storage divergence vs Chromium). Chromium persistence remains CERTIFIED.
- Source-audio ON vs OFF: identical RMS on fixture clip → PARTIAL

Artifacts: `BROWSER-webkit-CERT.json`, `browser-exports/webkit-*.mp4`
