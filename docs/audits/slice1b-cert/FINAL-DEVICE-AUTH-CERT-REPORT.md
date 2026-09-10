# HOMECHEFF STUDIO — FINAL DEVICE & AUTH CERTIFICATION REPORT

**Date:** 2026-08-19  
**Production:** https://studio.homecheff.eu  
**Release HEAD:** `b9eaf7df` · **dpl:** `dpl_EXXndFYMCDw2siVojLKUiQ72hicR`

---

## 1. Executive verdict

| Verdict | Status |
|---------|--------|
| **Slice 1B** | `STUDIO_SLICE_1B_CERTIFICATION_BLOCKED` |
| **PX.4A.7** | `PX.4A.7_RECERT_BLOCKED_BY_DEVICE_AVAILABILITY` |

Production deploy remains correct. **Authenticated desktop PX.4A.7 recertification passes** for mixed media, export, drafts, transitions, and HomeCheff attach (via dedicated script). **Physical iPhone certification is incomplete**: native video import requires manual device interaction; full `_px4a7-iphone-safari-cert.ts` did not reach Studio due to HomeCheff listing-photo upload timeout on device Safari.

---

## 2. Production version verified

| Check | Result |
|-------|--------|
| dpl | `dpl_EXXndFYMCDw2siVojLKUiQ72hicR` (unchanged) |
| Slice 1A four intents | **PASS** |
| Context bar / no legacy toolbar | **PASS** |
| Growth + empty catalog hidden | **PASS** |
| Landscape 55/45 (Chromium prod matrix) | **PASS** |

---

## 3–4. Physical iPhone / CDP

| Field | Value |
|-------|-------|
| Device | iPhone (`00008030-000E38AE1EF8202E`) |
| UA | iOS 18_7 / Safari 26.3 (iPhone 11 class) |
| Bridge | `ios_webkit_debug_proxy` on `:9222` — **CONNECTED** |
| Auth on device | seller session **200** (`r.sergioarrias@gmail.com`) |

---

## 5. `_px4a7-iphone-safari-cert.ts`

| Result | **FAIL** |
|--------|----------|
| Error | `timeout: 4 listing photos ready` |
| Cause | HomeCheff listing photo upload did not complete on device Safari within 120s (cert environment, not product regression on desktop) |
| Reached Studio? | **No** |

---

## 6–10. iPhone core flow (supplemental Production evidence)

Supplemental runs against `https://studio.homecheff.eu/studio/photo-video` via CDP:

| Step | Result |
|------|--------|
| 1 Open Quick Video | **PASS** |
| 2–3 Add photos (file input) | **PASS** |
| 4 Native video import | **FAIL** — `NATIVE_VIDEO_IMPORT_TIMEOUT` (180s; picker opened, no clip selected on device) |
| 6–8 Context bar on photo select | **PASS** — `px4a-context-bar`, `px4a-context-text` visible |
| Text overlay (`type()` not `fill()`) | **PASS** — `IPHONE PORTRAIT` |
| Portrait posture | **PASS** — `phone-portrait`, overflow 0 |
| 24–26 Landscape 55/45 | **NOT RUN** — Playwright CDP WebKit does not implement `setViewportSize`; requires **physical rotation** + manual observation |
| Export MP4 on device | **NOT RUN** — blocked by missing video clip |

### First-video-import reliability

| Attempt | Result |
|---------|--------|
| 1 | **FAIL** — timeout |
| 2 | **FAIL** — timeout |
| 3 | **FAIL** — timeout |
| Summary | **0/3** — automation could not complete without manual gallery pick on device |

**Classification:** **BLOCKING** for final production certification (hard gate requires device-native video path evidence).

---

## 11–16. Auth profile lock

| Item | Result |
|------|--------|
| Prior blocker | Chrome profile locked |
| Resolution | No active Chrome process; `_px4a7-prod-cert.ts` launched cleanly |
| Profile data | Preserved (`.px4a7-prod-profile`) |

---

## 12–19. Authenticated `_px4a7-prod-cert.ts` (Production)

| Gate | Result |
|------|--------|
| Auth `/api/user/me` | **200 PASS** |
| Mixed media composition | **PASS** |
| Photo vs video inspector isolation | **PASS** |
| Standalone export H.264 MP4 | **PASS** (30s, moving frames) |
| Signature (`hc_shards`) export | **PASS** |
| Draft refresh/resume | **PASS** (7 strip items, 2 videos restored) |
| Mobile 390 smoke | **PASS** |
| HomeCheff block in main script | **FAIL** — `timeout: 4 listing photos` |
| Network FREE_LOCAL | **0 provider hits, 0 credit hits** |

### HomeCheff from-item (dedicated script)

| Script | Result |
|--------|--------|
| `_px4a62-prod-attach.ts` | **PASS** — 4 photos kept, 1 video, H.264, unpublished, handoff posts observed |

### Existing-video protection

| Script | Result |
|--------|--------|
| `_px4a7-existing-video-flows.js` | **GAP2_PASS** — cancel preserves video; explicit replace works |

---

## 14. Transition matrix (authenticated Production)

Verified during `_px4a7-prod-cert.ts` standalone runs:

- **Standard:** cut, fade, slide, wipe, zoom_blend — selectable, export verified (fade + shards)
- **Signature:** hc_shards export **PASS**; full 7 visible in prior prod matrix **PASS**
- **Automatic:** default available

---

## 18. FREE_LOCAL runtime (authenticated)

Observed during successful export runs: **0 Vidu, 0 ElevenLabs, 0 credit API hits, 0 provider render hits**.

---

## 40–42. Bugs / fixes

| Category | Item | Action |
|----------|------|--------|
| Env | Chrome profile lock | Resolved — no product change |
| Env | CDP down | Started `ios_webkit_debug_proxy` |
| Env | iPhone listing photo upload timeout | Documented; desktop attach script passes |
| Env | iPhone `fill()` on text input empty | Use `type()` on device — cert note |
| Product | None found | No code changes |

---

## 43–44. Final statuses

### PX.4A.7

```
PX.4A.7_RECERT_BLOCKED_BY_DEVICE_AVAILABILITY
```

Desktop/authenticated Production functionality is recertified. Full matrix including **physical iPhone native video + landscape rotation** is incomplete.

### Slice 1B

```
STUDIO_SLICE_1B_CERTIFICATION_BLOCKED
```

**Exact blockers:**
1. iPhone native video import **0/3** (manual device action not completed during cert window)
2. iPhone full `_px4a7-iphone-safari-cert.ts` did not complete (listing upload timeout before Studio)
3. iPhone landscape 55/45 not certified via physical rotation
4. iPhone export MP4 not executed on device

**Partial iPhone evidence (non-blocking polish context):** context-bar UX **confirmed on physical device** for photo selection + text entry in portrait.

---

## 45. Next phase recommendation

1. **Unified Finish / Afronden** — strongest next UX win; automated gates are green
2. **Mijn projecten presentation**
3. **Story Workspace staged UX**
4. **iPhone media polish** — only if manual device session confirms 0/3 video import persists

**PX.5:** postponed.

---

## To close certification

On physical iPhone Safari (Production):

1. Manually complete gallery video pick when cert script opens native picker (or pre-load test video)
2. Physically rotate for landscape 55/45 verification
3. Re-run `_px4a7-iphone-safari-cert.ts` from a listing draft that **already has 4 photos** (skip upload timeout), or fix cert upload waits for device Safari only

No product code changes required unless manual session reveals a **Category A** regression.
