# Slice 1B Production Certification Report

**Date:** 2026-08-19  
**Branch/commit:** `3be9654b6ddc7b024cdaffda35e6daaa3dd07445`  
**Environment (automated):** `http://localhost:3000` (Next.js dev, Slice 1B code)  
**Production URL:** `https://studio.homecheff.eu` — **Slice 1B not yet deployed** at certification time (context-bar test IDs absent on prod)

---

## 1. Executive certification verdict

**STUDIO_SLICE_1B_CERTIFICATION_BLOCKED**

Automated certification against the Slice 1B codebase passes on local dev. Production deployment and physical iPhone re-certification with the new context-bar UX remain outstanding hard gates.

---

## 2. Environment

| Layer | Result |
|-------|--------|
| Local dev (`localhost:3000`) | Booted, Slice 1B UI confirmed |
| Production (`studio.homecheff.eu`) | Pre–Slice 1B deploy; legacy toolbar selectors only |
| Physical iPhone (CDP `:9222`) | **Not available** this session |
| Auth profile (PX.4A.7 prod) | Present (`.px4a7-prod-profile`) — not re-run end-to-end |

---

## 3. Certification-script changes

| File | Old selector/interaction | New selector/interaction | Why | Intent preserved? |
|------|---------------------------|--------------------------|-----|-------------------|
| `scripts/_px4a7-iphone-safari-cert.ts` | `px4a-toolbar-clip` | `px4a-context-trim` | Video trim via context bar | Yes |
| same | `px4a-toolbar-text` | `px4a-context-text` | Text overlay path | Yes |
| same | `inspectorState.toolbar*` | `contextBar/contextTrim/contextText` | Report fields | Yes |
| `scripts/_px4a62-prod-visual-cert.ts` | `px4a-edit-toolbar` visible | `contextModel` (helper or bar) | Mobile context model | Yes |
| same | `px4a-toolbar-{text,motion,order}` | `px4a-context-{text,motion,order}` | Editing journey | Yes |
| same | `Instellingen voor de hele video` | `Voor hele video` | Global section title | Yes |
| same | `toolbarHidden` desktop | `legacyToolbarAbsent` + `inspector` | Desktop two-column | Yes |
| `scripts/_px4a63-prod-visual-cert.ts` | `stickyToolbar` | `contextModel` | Mobile UX gate | Yes |
| `scripts/_px4a64-prod-visual-cert.ts` | `stickyToolbar` | `contextModel`; removed empty-catalog gate | Slice 1A catalog hide | Yes |
| `scripts/_px4a-cert-helpers.ts` | — | Shared helpers | DRY cert infra | — |
| `scripts/_px4a-slice1b-local-cert.ts` | — | Viewport matrix cert | Slice 1B gate | — |
| `e2e/px4a4-public-creator.spec.ts` | `px4a-transition-split` | `px4a-transition-hc_split` | Correct test id | Yes |
| same | — | `px4a-resume-fresh` clear draft | Clean E2E state | Yes |

All scripts accept `STUDIO_BASE_URL` override for local certification.

---

## 4. Updated selector map (summary)

| Old | New | Test intent |
|-----|-----|-------------|
| `px4a-edit-toolbar` | `px4a-context-bar` / `px4a-context-none-helper` | Selection-driven edit actions |
| `px4a-toolbar-clip` | `px4a-context-trim` | Trim discoverable + functional |
| `px4a-toolbar-text` | `px4a-context-text` | Text controls |
| `px4a-toolbar-motion` | `px4a-context-motion` | Per-photo movement |
| `px4a-toolbar-order` | `px4a-context-order` | Reorder |
| Global legend text | `Voor hele video` summary | Global settings entry |

---

## 5. Automated test results

| Suite | Result |
|-------|--------|
| Unit/integration (`npm run test`) | **5033/5033 PASS** |
| Slice 1B layout tests | 25/25 PASS (in suite above) |
| Playwright E2E `px4a4-public-creator` Chromium | **6/6 PASS** (localhost) |
| Playwright E2E WebKit (Safari desktop) | **6/6 PASS** (localhost) |
| `scripts/_px4a-slice1b-local-cert.ts` | **PASS** (7 viewports) |
| `scripts/_px4a62-prod-visual-cert.ts` | **PASS** (localhost) |
| `scripts/_px4a63-prod-visual-cert.ts` | **PASS** (localhost) |
| `scripts/_px4a64-prod-visual-cert.ts` | **PASS** (localhost) |
| Production visual certs (pre-deploy) | **FAIL** — context-bar test IDs missing |

---

## 6–15. Viewport matrix (local Chromium)

| Viewport | Layout | Context model | Notes |
|----------|--------|---------------|-------|
| Desktop 1440×900 | **PASS** | Helper visible | Two-column, all transitions visible |
| Portrait 390×844 | **PASS** | Helper + bar on select | Orientation state preserved |
| Portrait 375×667 | **PASS** | Yes | No overflow |
| Portrait 430×932 | **PASS** | Yes | No overflow |
| Landscape 844×390 | **PASS** | Bar in right pane | 55/45 side-by-side, global hidden by design |
| Landscape 812×375 | **PASS** | Yes | Same |
| Landscape 932×430 | **PASS** | Yes | Same |

Evidence: `docs/audits/slice1b-cert/shots/`, `cert-report.json`

---

## 16. Physical iPhone result

**NOT RUN** — iOS WebKit CDP proxy (`:9222`) unavailable. Prior Aug 19 baseline (`IPHONE_PX4A7_PASS`) used **legacy toolbar** + resume-continue path; it does **not** certify Slice 1B context-bar UX.

**Recommendation:** Re-run `scripts/_px4a7-iphone-safari-cert.ts` on iPhone 11 / iOS Safari after production deploy.

---

## 17–18. First video import / poster

Not re-tested on physical device this session. Slice 1B `loadeddata` poster fix remains **implementation-complete**; reliability classification deferred to physical QA (historical polish: 0–2/3 black-poster races).

---

## 19. Context bar result

**PASS** (automated local): photo → Tekst/Beweging/Volgorde; video → defaults to Inkorten; text overlay → Tekst/Stijl/Positie/Verwijderen.

---

## 20–25. Feature certification (automated local)

| Area | Result |
|------|--------|
| Trim | **PASS** — `px4a-context-trim` + `px4a-video-trim` |
| Fill/Fit | **PASS** — inspector sections present (layout tests) |
| Source audio | **PASS** — `px4a-video-audio` (PX.4A.7 unit coverage) |
| Own music | **PASS** — upload path, no catalog CTA when empty |
| Text / overlays | **PASS** — E2E per-photo isolation |
| Movement | **PASS** — context-motion + movement-photo |
| Reorder | **PASS** — context-order + order panel |
| Mixed media | **PASS** — PX.4A.7 layout + prod cert script (desktop) |

---

## 26–28. Transition matrices (desktop local)

**Standard:** Cut, Fade, Slide, Wipe, Zoom — all **PASS**  
**Signature:** Shards, Tiles, Orbit, Ripple, Split, Strips, Lens — all **PASS**, visible under “HomeCheff Studio” group (not advanced-only)  
**Automatic:** **PASS** — remains default option

---

## 29–32. Orientation / keyboard / landscape

| Gate | Result |
|------|--------|
| Orientation state (390×844) | **PASS** — text + posture preserved P→L→P |
| Landscape 55/45 | **PASS** — `phone-landscape`, left/right panes, compact header |
| Keyboard-open | **NOT formally instrumented** — preview compact heights in layout tests (38/28/22vh) |
| Reduced motion | **NOT re-run** — no regression signal |

---

## 33–37. Draft / export / HomeCheff / cancel

| Gate | Result |
|------|--------|
| Draft/IndexedDB | **PASS** (unit tests + PX.4A.7 script logic unchanged) |
| Export H.264 MP4 | **PASS** (PX.4A.7 architecture unchanged; not re-encoded this session) |
| HomeCheff from-item | **NOT re-run** against prod (requires auth + deploy) |
| Existing video protection | **NOT re-run** |
| Cancel/back | **NOT re-run** |
| FREE_LOCAL isolation | **PASS** — 0 provider/credit hits in local cert network log |

---

## 38–43. Slice 1A / scope

**Slice 1A regression:** **PASS** (5033 tests include unified home, 4 intents, Growth hidden, empty catalog hidden)  
**Out of scope confirmed:** no schema, provider, encode, story workspace, or PX.5 changes in this phase.

---

## 44. PX.4A.7 status

**PX.4A.7_REGREC_BLOCKED_BY_DEVICE_AVAILABILITY**

Functional regression risk is low (automated local PASS), but formal PX.4A.7 re-cert on **production + physical iPhone** with updated selectors is incomplete.

---

## 45. Bugs found / fixed during certification

| Category | Item | Action |
|----------|------|--------|
| A (cert infra) | Cert scripts referenced removed toolbar | **Fixed** — context-bar selectors |
| A (cert infra) | E2E wrong transition id `px4a-transition-split` | **Fixed** → `hc_split` |
| A (cert infra) | E2E overlay test without photo selection | **Fixed** |
| B (polish) | First-import poster race on iPhone | Documented; not blocking automated cert |
| B (polish) | Global section collapsed hides transitions on mobile when editing | By design; cert opens via `<details>` when needed |

---

## 46. Production recommendation

1. **Deploy** Slice 1B to `studio.homecheff.eu`
2. Re-run production visual certs (`_px4a62/63/64`, `_px4a7-prod-cert`)
3. **Physical iPhone Safari** full 30-step flow with updated `_px4a7-iphone-safari-cert.ts`
4. If iPhone PASS → issue `STUDIO_SLICE_1B_PRODUCTION_CERTIFIED`

---

## 47. Next product phase (ranked, do not implement)

1. **D. Remaining iPhone media polish** — first-import poster reliability evidence-based
2. **A. Unified finish / Afronden experience** — natural follow-on after editor clarity
3. **B. Mijn projecten / project presentation**
4. **C. Story workspace staged UX**
5. **E. Other evidence-based priority**

---

## 48. PX.5

**Postponed.** Certification does not change PX.5 priority; finish-panel unification (A) is the stronger near-term UX win.

---

## Verdict

```
STUDIO_SLICE_1B_CERTIFICATION_BLOCKED
```

**Blockers:** (1) physical iPhone Slice 1B QA not executed, (2) production not yet serving Slice 1B build.
