# HOMECHEFF STUDIO — SLICE 1B INTERACTIVE PHYSICAL IPHONE CERT REPORT

**Date:** 2026-08-20  
**Production:** https://studio.homecheff.eu  
**Release HEAD:** `b9eaf7df` · **dpl:** `dpl_EXXndFYMCDw2siVojLKUiQ72hicR`

---

## A. Executive verdict

| Verdict | Result |
|---------|--------|
| **Slice 1B** | `STUDIO_SLICE_1B_CERTIFICATION_BLOCKED` |
| **PX.4A.7** | `PX.4A.7_RECERT_BLOCKED` |

Interactive physical run **substantially progressed** native video import and editor gates on Production. **Two remaining hard blockers:** physical landscape certification and physical mixed-media MP4 export. No product code changed.

---

## B. Physical device

| Field | Evidence |
|-------|----------|
| Device / OS | iPhone (iPhone12,1 class), iOS 18.7 / Safari 26.3 |
| Bridge | `ios_webkit_debug_proxy` on `:9222` — connected for primary run |
| URL | `https://studio.homecheff.eu/studio/photo-video` |
| UX model | Slice 1B `px4a-context-bar` (not legacy toolbar) |

---

## C. Native import (interactive)

| Run | Result | Latency | Classification |
|-----|--------|---------|----------------|
| **RUN 1** | **FAIL** | Picker 238ms; no clip within 300s | `NATIVE_IOS_PICKER_LIMITATION` (no manual selection in window) |
| **RUN 2** | **PASS** | Picker 113ms → clip 160.5s → usable 161.8s; duration **6,0 sec** | Physical + manual |
| **RUN 3** | **PASS** | Picker 96ms → clip 66.9s → usable 68.2s; duration **6,0 sec** | Physical + manual |
| **Reliability** | **2/3** | Context bar video actions confirmed both passes | Acceptable for import path; RUN 1 missed initial prompt window |

**Confirmed on successful runs:** file returned to Safari, clip in strip, Video badge, duration shown, Tekst/Inkorten/Beeld/Videogeluid/Volgorde all visible.

---

## D. Physical editor (observed this run)

| Gate | Result | Notes |
|------|--------|-------|
| Video context bar | **PASS** | All five video actions |
| Photo context (no stale video) | **PASS** | Trim/fit/audio hidden on photo |
| Trim (Inkorten) | **PASS** | Panel opened; trim adjusted |
| Fill/Fit (Beeld) | **PASS** | Mode toggled |
| Videogeluid | **PASS** | Off state selected and persisted |
| Mixed media | **PASS** | 3 photos + 1 native 6s video in strip |
| Text via `type()` | **PASS** (content) | `IPHONE SLICE1B` entered; strict style/position gate = script assertion gap |
| Real iOS keyboard | **PASS** | Portrait, overflow 0, text field visible |
| Portrait | **PASS** | Overflow 0 |
| Standard transition (Vervagen) | **NOT CONFIRMED** | Click did not register before landscape phase; likely scroll/visibility — retest needed |
| Signature transition (Scherven) | **NOT CONFIRMED** | Same |

---

## E. Orientation

| Gate | Result | Classification |
|------|--------|----------------|
| Physical landscape | **NOT RUN / FAIL** | User not rotated within window; script then hit `TEST_SCRIPT_DEFECT` (`getAttribute` 30s throw — fixed post-run) |
| Landscape 55/45 | **NOT RUN** | Blocked |
| State preservation | **NOT RUN** | Text `IPHONE SLICE1B` captured pre-landscape in snapshot |
| Return to portrait | **NOT RUN** | Blocked |

**Resume attempt:** CDP reconnect failed after primary session (`ENVIRONMENT_FAILURE` / Playwright CDP timeout). Bridge HTTP list still responds; new Playwright sessions unstable until Safari/proxy refresh.

---

## F. Export

| Gate | Result |
|------|--------|
| FREE_LOCAL isolation (session) | **PASS** (0 provider/credit hits during editor phase) |
| Physical mixed-media MP4 export | **NOT RUN** |
| MP4 playback validation | **NOT RUN** |

---

## G. Previously certified (unchanged)

| Gate | Source |
|------|--------|
| 5056/5056 tests, build, E2E, viewport matrix | AUTOMATED |
| PX4A62/63/64 visual, 5+7 transitions, FREE_LOCAL | AUTOMATED |
| Authenticated desktop PX.4A.7 | AUTOMATED |
| `_px4a62-prod-attach.ts` | PREVIOUSLY CERTIFIED |
| Existing-video GAP2 | PREVIOUSLY CERTIFIED |

---

## H. Code changes

| Area | Files |
|------|-------|
| **Product code** | **None** |
| Cert-only | `_px4a7-iphone-physical-closeout-cert.ts` (interactive Dutch prompts, full gates, posture evaluate fix), `_px4a7-iphone-physical-resume-cert.ts` (new), `_px4a7-iphone-safari-cert.ts` (`studio-direct` mode) |

---

## I. Remaining blockers (only these)

1. **Physical landscape** — rotate device; rerun resume script with stable CDP
2. **Physical mixed-media MP4 export** — depends on #1 + project still loaded
3. **Optional:** RUN 1 retry for 3/3 import reliability (not product-blocking if 2/3 holds)

---

## J. Final verdicts

```
STUDIO_SLICE_1B_CERTIFICATION_BLOCKED
PX.4A.7_RECERT_BLOCKED
```

---

## Artifacts

- `docs/audits/px4a7-prod-cert/iphone-physical-closeout-cert.json`
- `docs/audits/px4a7-prod-cert/iphone-interactive-run.log`
- `docs/audits/px4a7-prod-cert/iphone-shots/` (video-run-2, video-run-3)

---

## Recommended next step (do not implement)

After landscape + export pass on device:

1. Unified **Afronden / Finish** experience  
2. **Mijn projecten**  
3. Story workspace staged UX  
4. iPhone polish only if evidence requires  
5. PX.5 later  

**To finish on device:** refresh Safari Studio tab if needed, then:

```bash
npx tsx scripts/_px4a7-iphone-physical-resume-cert.ts
```

When prompted: rotate horizontal → wait for detect → rotate portrait → export runs automatically.
