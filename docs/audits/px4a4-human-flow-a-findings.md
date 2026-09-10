# PX.4A.4 — Human Production Flow A findings

**Date:** 2026-08-17  
**Surface:** Production `https://studio.homecheff.eu/studio/photo-video/from-item` (Flow A) compared with public `/studio/photo-video`  
**Do not start PX.4A.5.**  
**PX.4A.4 is not COMPLETE.** Remaining: Flow B reorder + contextual text, C–E, Back/Refresh.

Production text fix (public compositor): **LIVE** 2026-08-17 — PR [#38](https://github.com/rassdread/homecheff-motion/pull/38) · feature `664584235f65a1198265b85856ad596c65e58a4c` · merge `e21fc66ddb471015199be8278751fe4bcbd48af1` · dpl `dpl_5CCJPWCrJDtq4QZ5qWQpHC3KoCxr`. 9:16 Modern `Test` white-pixel count 509 (was 22). `/from-item` shares this deployment; human contextual confirm remains in Flow B.

---

## Flow A status (human)

| Check | Status |
|-------|--------|
| Functional cross-product flow | **PASS so far** |
| Photo addition | **PASS** (photos could be added) |
| Return to HomeCheff | **appears PASS** |
| Reorder | **HUMAN NOT TESTED** — do not mark human PASS |
| Text overlay | **BUG classified and fixed in Studio** — not yet Production-verified after deploy |
| Watermark | **FUNCTIONAL**; visual polish requested; **no official transparent globe-man exists** |
| Flows B–E, Back, Refresh | **not finished** |

---

## 1. Photo add UX — UX/POLISH

Human could add photos, but it was not obvious that photos belong in the composition. They asked for a conventional control such as **+ Foto toevoegen** / **+ Foto's kiezen**. Drag/drop may remain as extra convenience.

**Classification: UX/POLISH.** Adding photos is not materially inaccessible.

Current Studio already has a green file-picker label:

- Public: `Foto's toevoegen` (`px4a.photos.add`)
- Item journey: `Andere foto toevoegen` (`px4a.item.addExtra`)

No composer redesign during certification. Defer copy/placement polish (leading `+`, stronger affordance) off the 4A.4 blocker list.

---

## 2. Text overlay — classified bug (release blocker for default font)

Human typed text and did not see normal letters in the preview; they saw dots/points.

### Reproduction (Production public compositor)

Path: `/studio/photo-video`  
Same renderer as `/from-item` (`PhotoVideoPreviewCanvas`). From-item without the item HMAC cookie redirects to login; classification uses the shared canvas.

Protocol: simple text `Test`, default font (Modern), white, medium size, centered, dark background, ratios 9:16 / 1:1 / 16:9.

### Classification

| Id | Question | Result |
|----|----------|--------|
| A | Is text itself broken? | **Default Modern is broken in size.** Glyphs still exist at canvas default **10px**, which reads as dots. Intended medium size on 9:16 is ~30px. |
| B | Only one font/style? | **Yes — fonts whose stack contains `var(...)`.** Only Modern uses `var(--font-geist-sans)`. **Sterk** (Arial Black) paints at the requested size (~677 white pixels vs ~22 on Modern). |
| C | Contextual vs public? | **Same component.** Not a from-item-only bug. |
| D | Selection chrome as dots? | Green selection stroke is present around the tiny pill and can reinforce the “dots” look. **Not the root cause.** |

### Root cause

Canvas 2D rejects a `ctx.font` shorthand that includes `var(--font-geist-sans)`. Chromium then keeps the previous font: `10px sans-serif`. Family **and** size are dropped.

Production font probe (2026-08-17):

| Requested | Applied | `measureText("Test")` |
|-----------|---------|------------------------|
| `700 48px var(--font-geist-sans), ui-sans-serif, …` | `10px sans-serif` | 18 |
| `700 48px ui-sans-serif, system-ui, sans-serif` | `bold 48px ui-sans-serif, …` | 93 |
| `700 48px "Geist", "Geist Fallback"` | `bold 48px Geist, "Geist Fallback"` | 101 |

### Fix (smallest)

Resolve CSS variables **before** assigning `ctx.font` (`canvasFontShorthand` in `src/lib/photo-video/text-overlay.ts`). Do not put raw `var(` into the canvas font.

**Not Production-verified until this Studio change is deployed.** Re-check `/from-item` after deploy with `Test` / Modern / white / medium / all ratios.

---

## 3. HomeCheff Studio watermark — PX.4A-POLISH-WATERMARK (not a 4A.4 blocker)

Human likes globe-man + “HomeCheff Studio” and wants **[transparent globe-man] HomeCheff Studio** with no rectangular logo box.

**Ticket:** `PX.4A-POLISH-WATERMARK`  
Create/use an official transparent-background globe-man asset and preserve the HomeCheff Studio lockup.

**Does not block PX.4A.4.** Current functional branding remains acceptable: globe-man + HomeCheff Studio. Do not remove the watermark. No “Powered by” text inside the video.

### Assets inspected (do not redraw; do not generate artwork in 4A.4)

| Asset | Size | Color type | Alpha |
|-------|------|------------|-------|
| Studio `public/homecheff-globe-man.png` (watermark SSOT) | 1254×1254 | RGB | none; corners ~`(253,255,254)` opaque |
| Studio `public/brand/homecheff-mark.png` | 192×192 | RGBA | **min alpha 255** (white box) |
| Studio favicons / apple-touch | derived | RGB/RGBA | opaque |
| HomeCheff `public/homecheff-globeman.png` | 886×886 | RGBA | **min alpha 255** (white box) |

HomeCheff has `scripts/remove-globeman-bg.mjs` (one-off white strip). **Current** `homecheff-globeman.png` was not left transparent.

**No official transparent globe-man exists in Studio or HomeCheff.** Do not silently modify the official opaque asset during the text-blocker fix.

The preview also draws a dark rounded pill behind the lockup (`rgba(4, 20, 40, 0.48)`). Removing the pill without a transparent PNG would make the white square **more** visible.

Future target: `[transparent globe-man] HomeCheff Studio` with only subtle contrast treatment where required. Verify later on light photo, dark photo, 9:16, 1:1, 16:9.

---

## 4. Reorder — human pending

Human did not change photo order in Flow A.

- **Do not** mark human reorder PASS.
- Automated reorder tests already exist.
- Schedule in **Flow B** or mobile **Flow D**: move photo 3 before photo 1 → preview → leave/re-enter → order persists.

---

## 5. Certification gate

PX.4A.4 stays **INCOMPLETE** until:

1. Default overlay text is re-checked on Production `/from-item` after the font fix deploy.
2. Remaining critical A–E checks, Back, and Refresh are finished.
3. Human reorder is done in B or D.

Do not start PX.4A.5.
