# PX.3 — Final Report — Simple Studio Home

**Phase:** PX.3 — Simple Studio Home / intent-first creation entry  
**Date:** 2026-08-17  
**Verdict:** **COMPLETE / PASS**  
**PX.4:** **NOT STARTED** — no listing import without explicit approval.

Studio Home is now one front door: **Wat wil je maken?** then existing tools. PX.2 labels kept. Routes, SSO, credits, editor/save/publish, and advanced engines were not removed or rewritten.

---

## Identity card

| Field | Value |
|-------|-------|
| Repository | `rassdread/homecheff-motion` |
| PR | [#32](https://github.com/rassdread/homecheff-motion/pull/32) |
| Feature SHA | `3b81e68bbac171225c4af71b06a1fa74863c0436` |
| Merge SHA | `4311009bd8abc035e211672737568f3ece04e910` |
| Production deployment | `dpl_Ucj649fGvAyTQU8nnzbYVXhqLKKY` |
| Production alias | `studio.homecheff.eu` (also `motion.homecheff.eu`, `homecheff-motion.vercel.app`) |
| Rollback | Revert PR #32 (or promote previous Production `homecheff-motion-6bbkr9tq5`). Copy/nav/entry only; no DB migration. |
| Architecture / engines changed? | **No** — routing/presentation layer |
| SSO / credits / editor-save-publish changed? | **No** |
| **GO / NO-GO for PX.4** | **HOLD** |

---

## 1. PX.3 verdict

**COMPLETE / PASS.** A normal creator can start from one question (**Wat wil je maken?**) without first choosing five internal products. Returning users can **Ga verder**. Projects and Library stay in chrome. Advanced tools remain in **Meer**.

---

## 2. BEFORE Home hierarchy

1. Five-product orbit (planets + chrome) as equal starts  
2. Hero **Wat wil je maken?** competing with Beelden / Verhalen / Animatie  
3. Getting started + mobile product chips  
4. `/studio` orchestrator and 7 tool quick-creates **before** continue  
5. `/studio/experience` = 5 P0 **packs**, not intents  

Audit: `docs/audits/studio-px3-current-state.md`.

---

## 3. AFTER Home hierarchy

**P1** Wat wil je maken? → `/studio/experience`  
**P2** Ga verder → `/studio` (continue list from existing `view=shell`)  
**P3** Projecten + Bibliotheek (global chrome)  
**P4** Meer: Beelden, Verhalen, Animatie, Video afronden (+ Prijzen when not production-hidden)

---

## 4. Primary CTA before → after

| Who | Before | After |
|-----|--------|-------|
| All | Wat wil je maken? → `/studio/experience` | **Unchanged destination** |
| Signed-in secondary | Bibliotheek openen → `/library` | **Ga verder** → `/studio` |
| Signed-out secondary | pricing / how-it-works | Unchanged how-it-works on mobile key; hero still pricing |

---

## 5. Creation intents implemented

Beeld · Video · Verhaal · Animatie · Bewerken

---

## 6. Intent → existing route/workflow map

| Intent | NL | Route | Engine |
|--------|----|-------|--------|
| image | Maak of bewerk een afbeelding | `/editor/start` | Editor |
| video | Maak een video | `/studio/start` | Orchestrator / studio start |
| story | Maak een verhaal met meerdere scènes | `/studio/storyboards/new` | Story workspace |
| animation | Breng een beeld of scène tot leven | `/motion/start` | Motion |
| edit | Ik heb al iets en wil verder | `/projects` | Projects / continue |

P0 packs remain **under** the chooser (not deleted). Finish/publish is not a start intent; it stays in Meer.

---

## 7. Navigation before → after

**Before (equal tabs):** Home, Beelden, Verhalen, Animatie, Video afronden, Projecten, Bibliotheek  

**After (global):** Home, Projecten, Bibliotheek  
**After (Meer):** Beelden, Verhalen, Animatie, Video afronden  

Production anonymous HTML: **Home · Bibliotheek · Meer**.

---

## 8. What disappeared from primary UI

Five equal product tabs; mobile chips for Beelden / Verhalen / Instant; orchestrator-first `/studio` dashboard; pack-first experience empty state.

Nothing was deleted from the product.

---

## 9. What remains available as advanced functionality

Director V2, Adaptive Workspace, Classic editor, worlds, memory/consistency, Copilot, Instant, orchestrator, movie-builder, providers, brand kits, language exports, character/location/object pipelines, Library versioning. Reachable via Meer, landings, deep links, and dashboard “Meer opties”.

---

## 10. Continue / recent-work behaviour

- Signed-in Home secondary: **Ga verder** → `/studio`  
- `/studio` continue list still from `/api/me/studio-insights?view=shell` (SP.2D-F)  
- `/` recent projects still client snapshot; library still `recent?limit=8`  
- No new Home dashboard API on `/`

---

## 11. Mobile changes

Primary CTA remains full-width `min-h-[44px]`. Product chips removed. Drawer: destinations first, then Meer tools. Touch targets on intent cards `min-h-[72px]`.

---

## 12. Routes preserved

`/`, `/maak`, `/studio`, `/studio/start`, `/studio/experience`, `/studio/storyboards/*`, `/editor*`, `/motion*`, `/animate*`, `/publish*`, `/library*`, `/projects`, `/videos`, `/account`, `/account/credits`, `/auth/sso/silent`. Production 200 on inspected deep links including `/studio/worlds` and `/animate/instant`.

---

## 13. Advanced capabilities preserved

None deleted. Classic `/studio/storyboards/[id]/classic`, Instant, worlds, orchestrator APIs still in the build route table.

---

## 14. Files changed

21 files: PX.3 contract + tests, nav split (global vs Meer), intent chooser, experience funnel, studio dashboard, Home CTAs/mobile chips, NL/EN i18n, PX.3 audit + PX.2 close-out docs.

---

## 15. Tests added/updated

Added `src/lib/studio-px3-home.test.ts` (registered in `package.json`). Updated suite/landing/PX.2/universe tests for global vs tool nav and Ga verder.

---

## 16. Test results

**4857 pass / 0 fail / 0 skipped** (4857 tests, 839 suites).  
(+10 PX.3 tests vs PX.2; previously skipped DB-gated test ran here because `DATABASE_URL` is set.)

---

## 17. Lint result

**PASS** — 0 errors, 440 pre-existing warnings.

---

## 18. TypeScript result

**PASS** — `tsc --noEmit`.

---

## 19. Build result

**PASS** — `npm run build` (Next.js 16.2.4). Advanced routes still present.

---

## 20. SSO/auth regression result

**PASS / unchanged.** `/` 307 → `/auth/sso/silent?returnTo=%2F&mode=public`. Silent 302 to `homecheff.eu/auth/sso/start` with `interaction=silent`. `middleware.ts` untouched.

---

## 21. Credits/billing regression result

**PASS / unchanged.** `/account/credits` 200. No Stripe/credit-model edits.

---

## 22. Editor/save/publish regression result

**PASS / unchanged.** No editor, autosave, export, or publish pipeline edits. `/editor/start` and `/publish` 200.

---

## 23. Home performance before → after

Code: Home still shell-first (`view=shell`, library `recent?limit=8`, no 500-row query on Home).  

Public warm TTFB after Production (n=5): `/studio` ≈ 100–184 ms; `/studio/experience` ≈ 94–183 ms. Authenticated SP.2D-F usable-path (p50 ≈ 340 ms) was not re-instrumented with a logged-in session; the critical-path fetches were not added to.

---

## 24. Production screens inspected

`/`, `/studio`, `/studio/experience`, `/editor`, `/editor/start`, `/studio/start`, `/studio/storyboards/new`, `/motion`, `/motion/start`, `/publish`, `/library`, `/projects`, `/studio/worlds`, `/animate/instant`, `/account/credits`. Production i18n chunk contains PX.3 intent strings.

---

## 25. Remaining UX complexity

- Planet orbit on `/` still shows five products as visual discovery (not chrome).  
- Product landings still market Beelden/Verhalen/Animatie (correct for those pages).  
- Experience packs still appear below intents.  
- `/studio` still hydrates orchestrator after continue (kept on purpose).  
- SEO English footer still says storyboards/publish (deferred).  

---

## 26. Explicitly deferred HomeCheff integration work

No listing/product import, attach, or returnUrl. Architecture does not block PX.4 (`/studio/experience` remains the create door).

---

## 27–32. Ship record

| # | Field | Value |
|---|-------|-------|
| 27 | PR | #32 |
| 28 | Feature SHA | `3b81e68bbac171225c4af71b06a1fa74863c0436` |
| 29 | Merge SHA | `4311009bd8abc035e211672737568f3ece04e910` |
| 30 | Production deployment | `dpl_Ucj649fGvAyTQU8nnzbYVXhqLKKY` |
| 31 | Production alias | `studio.homecheff.eu` |
| 32 | Rollback | Revert PR #32 or promote `homecheff-motion-6bbkr9tq5` |

---

## 33. Recommended next PX phase — DO NOT START

**PX.4 — HomeCheff → Studio contextual creation** (listing → Maak promotievideo → prefilled Studio context).

No PX.4 implementation without explicit approval.
