# HOMECHEFF STUDIO — SLICE 1B PHYSICAL IPHONE CLOSEOUT REPORT

**Date:** 2026-08-20  
**Production:** https://studio.homecheff.eu  
**Release HEAD:** `b9eaf7df` · **Product:** `8210ebf1` · **dpl:** `dpl_EXXndFYMCDw2siVojLKUiQ72hicR`

---

## Executive verdict

| Verdict | Result |
|---------|--------|
| **Slice 1B** | `STUDIO_SLICE_1B_CERTIFICATION_BLOCKED` |
| **PX.4A.7** | `PX.4A.7_RECERT_BLOCKED` |

Production deploy and automated certification remain valid. Physical iPhone **native video import (0/3)**, **landscape**, and **MP4 export** were **not certified** in this closeout because no video clip was manually selected on the device during three 240s picker waits (~12 minutes total).

---

## What was tested this session

| Activity | Method |
|----------|--------|
| CDP preflight | `curl :9222/json/list`, `ios_webkit_debug_proxy` |
| Studio-direct closeout | `scripts/_px4a7-iphone-physical-closeout-cert.ts` |
| Device state probe | `scripts/_px4a7-iphone-probe.ts` |
| Cert script cleanup | `PX4A7_IPHONE_MODE=studio-direct` on `_px4a7-iphone-safari-cert.ts` |

## What required physical user interaction

| Step | User action required | Observed |
|------|---------------------|----------|
| Native video import ×3 | Tap **+ Video** → pick a video in iOS picker | **Not performed** during automated wait windows |
| Physical landscape | Rotate iPhone horizontal | **Not reached** (blocked on video) |
| Return to portrait | Rotate iPhone vertical | **Not reached** |
| MP4 export playback | Open exported file on device | **Not reached** |

---

## Certification matrix

| Gate | Result | Evidence | Classification |
|------|--------|----------|----------------|
| Production release | **PASS** | HEAD `b9eaf7df`, dpl `dpl_EXXndFYMCDw2siVojLKUiQ72hicR` | — |
| Physical iPhone connection | **PASS** | CDP `:9222`, UA iOS 18_7 Safari 26.3, device connected | — |
| Quick Video open | **PASS** | Tab on `/studio/photo-video` (this session + prior) | — |
| Photo import | **PASS** | `px4a-photo-0` via file input (this session) | — |
| Native video import run 1 | **FAIL** | Picker opened 77ms; no clip in strip within 240s | `NATIVE_IOS_PICKER_LIMITATION` |
| Native video import run 2 | **FAIL** | Picker opened 121ms; no clip within 240s | `NATIVE_IOS_PICKER_LIMITATION` |
| Native video import run 3 | **FAIL** | Picker opened 108ms; no clip within 240s | `NATIVE_IOS_PICKER_LIMITATION` |
| Video import reliability | **0/3** | `iphone-physical-closeout-cert.json` | `NATIVE_IOS_PICKER_LIMITATION` |
| Video context bar (trim/fit/audio) | **NOT RUN** | Blocked — no native video clip | — |
| Trim (Inkorten) | **NOT RUN** | Blocked | — |
| Fill/Fit (Beeld) | **NOT RUN** | Blocked | — |
| Source audio (Videogeluid) | **NOT RUN** | Blocked | — |
| Mixed media (photo + native video) | **NOT RUN** | Strip had 2 photos only after closeout | — |
| Text UX (`type()`) | **PASS** (prior) | `IPHONE PORTRAIT` via `type()`; context bar visible | — |
| Keyboard compact posture | **NOT RUN** | Blocked on full text closeout | — |
| Portrait posture / overflow | **PASS** (prior + probe) | `phone-portrait`, overflow 0 | — |
| Physical landscape 55/45 | **NOT RUN** | Requires device rotation; script paused correctly | `DEVICE_AUTOMATION_LIMITATION` |
| Landscape state preservation | **NOT RUN** | Blocked | — |
| Return to portrait | **NOT RUN** | Blocked | — |
| Standard transition (Knippen/Vervagen) | **PASS** (automated prod) | Chromium/WebKit E2E + prod matrix | — |
| Signature transition (Scherven +) | **PASS** (automated prod) | 5+7 transition inventory certified | — |
| Transitions on physical iPhone | **NOT RUN** | Blocked on video | — |
| FREE_LOCAL isolation | **PASS** (automated) | 0 provider/credit hits in prod cert | — |
| Physical MP4 export | **NOT RUN** | Blocked — no native video project | — |
| HomeCheff from-item smoke | **PASS** (prior) | `_px4a62-prod-attach.ts` | — |
| Existing-video GAP2 | **PASS** (prior) | `_px4a7-existing-video-flows.js` | — |
| Authenticated desktop PX.4A.7 | **PASS** (prior) | Mixed media, H.264, hc_shards, draft, 390 smoke, 0 hits | — |
| Automated tests 5056/5056 | **PASS** (prior) | Unchanged on release HEAD | — |
| Chromium E2E 6/6 | **PASS** (prior) | — | — |
| WebKit desktop E2E 6/6 | **PASS** (prior) | — | — |
| 7-viewport matrix | **PASS** (prior) | Includes emulated phone-landscape 55/45 | — |

---

## Native video import detail

Each run:

1. **+ Video** clicked via CDP → native iOS picker opened (**confirmed**)
2. Script paused with console banner; waited **240s** per run
3. No `px4a-video-thumb-*` or new video tile detected
4. Classification: **`NATIVE_IOS_PICKER_LIMITATION`** (automation cannot select in native picker; manual pick required)

This matches the prior session result (**0/3**). The product path to open the picker works; certification requires a human to complete gallery selection on the physical device.

---

## Code changes (cert infrastructure only)

| File | Change |
|------|--------|
| `scripts/_px4a7-iphone-physical-closeout-cert.ts` | **New** — Studio-direct closeout with 3× native picker wait, landscape pause, export |
| `scripts/_px4a7-iphone-safari-cert.ts` | `PX4A7_IPHONE_MODE=studio-direct` bypasses listing-photo upload |
| `scripts/_px4a7-iphone-probe.ts` | **New** — lightweight CDP state probe |

**No product code changed.** No regressions identified.

---

## Remaining blockers (only these)

1. **Native iPhone video import** — manual gallery pick required; **0/3** reliability observed
2. **Physical landscape certification** — device rotation + state preservation (depends on #1)
3. **Physical mixed-media MP4 export** — depends on #1

---

## Recommended next step (do not implement here)

After physical iPhone gates pass:

1. Unified **Afronden / Finish** experience  
2. **Mijn projecten** presentation  
3. Story workspace staged UX  
4. iPhone media polish only if evidence warrants  
5. **PX.5** remains postponed  

### To unblock certification on device

Re-run closeout with the iPhone in hand:

```bash
npx tsx scripts/_px4a7-iphone-physical-closeout-cert.ts
```

When each **RUN N** banner appears, select a video on the iPhone immediately. When prompted, rotate to landscape, then back to portrait.

---

## Artifacts

- `docs/audits/px4a7-prod-cert/iphone-physical-closeout-cert.json`
- `docs/audits/px4a7-prod-cert/iphone-closeout-run.log`
- Prior: `docs/audits/slice1b-cert/FINAL-DEVICE-AUTH-CERT-REPORT.md`
