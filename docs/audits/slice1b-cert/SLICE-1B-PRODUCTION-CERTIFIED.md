# HOMECHEFF STUDIO — SLICE 1B PRODUCTION CERTIFICATION CLOSEOUT

**Date:** 2026-08-20  
**Production:** https://studio.homecheff.eu  
**Release HEAD:** `b9eaf7df` · **dpl:** `dpl_EXXndFYMCDw2siVojLKUiQ72hicR`

---

## Final verdicts

```
STUDIO_SLICE_1B_PRODUCTION_CERTIFIED
PX.4A.7_RECERTIFIED
```

**Product code changed:** No  
**Product regression found:** No

---

## Certification matrix

| Gate | Result | Evidence | Classification |
|------|--------|----------|----------------|
| Physical iPhone connection | **PASS** | iOS 18.7 Safari 26.3 via CDP | — |
| Native video reliability | **PASS (2/3)** | RUN 2+3 PASS; RUN 1 missed manual pick | `NATIVE_IOS_PICKER_LIMITATION` |
| Video controls (context/trim/fit/audio) | **PASS** | Prior interactive run | PHYSICAL IPHONE |
| Mixed media | **PASS** | 4 photos + 1 native 6s video | PHYSICAL IPHONE |
| Portrait | **PASS** | overflow 0 | PHYSICAL IPHONE |
| **Physical landscape** | **PASS** | `phone-landscape`, left+right panes, overflow 0 | PHYSICAL IPHONE + MANUAL |
| **Landscape 55/45** | **PASS** | left/right panes, Video maken reachable, 1 canvas | PHYSICAL IPHONE |
| **Landscape state preservation** | **PASS** | 5 items, text `IPHONE SLICE1B`, video selected | PHYSICAL IPHONE |
| **Return to portrait** | **PASS** | posture restored, project intact, overflow 0 | PHYSICAL IPHONE + MANUAL |
| **Physical MP4 export** | **PASS** | 1.83 MB video/mp4, 11s encode | PHYSICAL IPHONE |
| **MP4 validity** | **PASS** | H.264 local blob, progress completed | PHYSICAL IPHONE |
| **FREE_LOCAL physical export** | **PASS** | 0 provider, 0 credit hits | PHYSICAL IPHONE |
| Automated tests / E2E / matrix | **PASS** | Retained from prior cert | AUTOMATED |
| HomeCheff attach | **PASS** | `_px4a62-prod-attach.ts` | PREVIOUSLY CERTIFIED |
| GAP2 | **PASS** | cancel + explicit replace | PREVIOUSLY CERTIFIED |
| Authenticated desktop PX.4A.7 | **PASS** | Prior run | AUTOMATED |

---

## Resume run evidence (2026-08-20)

- Landscape: `phone-landscape`, `px4a-left-pane` + `px4a-right-pane`, overflow 0
- State: 5 strip items preserved through rotation; text `IPHONE SLICE1B` intact
- Export: progress UI → complete in 11s; blob 1,828,591 bytes `video/mp4`; 0 paid network hits

Artifacts:
- `docs/audits/px4a7-prod-cert/iphone-physical-resume-cert.json`
- `docs/audits/px4a7-prod-cert/iphone-resume-run2.log`
- `docs/audits/px4a7-prod-cert/iphone-shots/` (landscape, portrait-return)

---

## Native import note

RUN 1 failed only because no manual gallery selection occurred within the timeout window. RUN 2 and RUN 3 demonstrate reliable native iOS video import on Production. **Not a product regression.**

---

## Cert-only code changes

- `_px4a7-iphone-physical-closeout-cert.ts`
- `_px4a7-iphone-physical-resume-cert.ts`
- `_px4a7-iphone-safari-cert.ts` (studio-direct mode)
- `_px4a7-iphone-probe.ts`

---

## Slice 1B closed

Recommended next product phase (**do not start**):

**Unified Afronden / Finish experience**

Then: Mijn projecten → Story workspace staged UX → iPhone polish if needed → PX.5 later.
