# PX.2 — Final Report — Studio IA & terminology

**Phase:** PX.2 — Information architecture & terminology  
**Date:** 2026-08-17  
**Verdict:** **COMPLETE / PASS**  
**PX.3:** **NOT STARTED** — no implementation without explicit approval.

Studio now leads with outcomes and honest Dutch labels. Advanced tools stay reachable. Routes, SSO, credits, and editor/save/publish were not changed.

---

## Identity card

| Field | Value |
|-------|-------|
| Repository | `rassdread/homecheff-motion` |
| PR | [#31](https://github.com/rassdread/homecheff-motion/pull/31) |
| Feature SHA | `bab75c4f4d7cea9afd5930f01bc6026ce08c9d6e` |
| Merge SHA | `d815d600a6384df35586943d4492a2aa80c046c3` |
| Production deployment | `dpl_GeDdyi1xFoURfMNvMaxRR2XjQx4K` |
| Production alias | `studio.homecheff.eu` (also `motion.homecheff.eu`, `homecheff-motion.vercel.app`) |
| Rollback | Revert PR #31 (or promote previous Production `homecheff-motion-fehg07352`). Copy/nav only; no DB migration. |
| Architecture / routes changed? | **No** |
| SSO / credits / editor-save-publish changed? | **No** |
| **GO / NO-GO for PX.3** | **HOLD** — recommended next phase, do not start without approval |

---

## 1. PX.2 verdict

**COMPLETE / PASS.** A normal creator can see where they are (HomeCheff Studio), what they can do (beeld, verhaal, animatie, afronden), and one obvious next action (**Wat wil je maken?**) without first learning Universe / Motion Studio / Experience / Copilot architecture.

---

## 2. Terminology inventory

| Role | Path |
|------|------|
| Canonical contract | `src/lib/studio-px2-terminology.ts` |
| Tests | `src/lib/studio-px2-terminology.test.ts` |
| Audit input | `docs/audits/studio-px1-product-experience-audit.md` |
| IA notes | `docs/audits/studio-px2-information-architecture.md` |

User-facing strings were classified as normal UI vs advanced vs route/internal vs SEO. Only normal UI copy was rewritten. Routes, APIs, schema, and package name `frameflow-ai` stay internal.

---

## 3. Before → after terminology

| Internal | Before (NL UI) | After (NL UI) |
|----------|----------------|---------------|
| Universe | Universe / productielijn | Home (never shown as a product) |
| Motion Studio dashboard | Motion Studio | Jouw studio |
| Editor | Editor | Beelden |
| Studio hub | Studio | Verhalen |
| Motion / Animate | Motion | Animatie |
| Publish | Publish | Video afronden / Afronden |
| Storyboard / Videoverhaal | Storyboard / videoverhaal | Verhaal |
| Experience chooser | Choose an experience | Wat wil je maken? |
| Copilot / Assistent | Studio Copilot | Hulp |
| Director chrome | AI-regisseur | Suggesties (Director remains advanced) |
| Props | Props | Objecten |
| World | Wereld / World | Stijlwereld |
| Assets | Assetbibliotheek | Bestanden |
| Memory | Geheugen | Kenmerken |
| Consistency | Consistentie / Doorlopendheid | Zelfde stijl |
| Handoff | handoff | Doorgaan naar… |
| Create. Animate. Publish. | English slogan | Beeld, video en verhaal — in één studio. |
| Credits / FrameFlow | Credits / FrameFlow | Credits kept; FrameFlow buried |

---

## 4. Navigation hierarchy before → after

**Before:** Home, Editor, Studio, Motion, Publish, Projecten, Library — five internal products as equals, plus Universe/Motion Studio naming.

**After (labels only, hrefs unchanged):** Home, Beelden, Verhalen, Animatie, Video afronden, Projecten, Bibliotheek.

Planet chrome: BEELDEN / VERHALEN / ANIMATIE / AFRONDEN / BIBLIOTHEEK.

The five-product orbit is not collapsed. That is PX.3.

---

## 5. Prominent Start / New / Create CTAs found

| Surface | Primary / notes | Destination |
|---------|-----------------|-------------|
| Home hero primary | Wat wil je maken? | `/studio/experience` |
| Home hero secondary | pricing (signed-out) / library (signed-in) | unchanged |
| Getting started | Wat wil je maken? / Beelden bewerken / Bibliotheek openen | see §7 |
| Mobile quick actions | same primary/secondary + chips | `md:hidden`, min-h 44px |
| `/studio` landing | Nieuw verhaal | `/studio/storyboards/new` |
| `/editor` landing | Start met bewerken | `/editor/start` |
| `/motion` landing | Animatie starten | `/motion/start` |
| `/publish` landing | Video afronden | `/publish/start` |
| Signup Aan de slag | account start, left as-is | `/signup?next=%2Feditor` |
| Planet clicks | still open public product pages | `/editor`, `/studio`, `/motion`, `/publish`, `/library` |

---

## 6. Which CTA labels changed

Home primary is now **Wat wil je maken?** for both signed-in and signed-out (no more “Ga verder” while opening the chooser). Getting-started, landings, suite home cards, and “Start nieuw project” variants follow the same vocabulary.

---

## 7. Which destinations remained unchanged

All of them. Home primary is still `/studio/experience`. Landings still use `/editor/start`, `/studio/storyboards/new`, `/motion/start`, `/publish/start`. Getting-started Editor now honestly goes to `/editor` (it previously reused the experience href while saying “Open Editor”).

---

## 8. Simple vs Advanced presentation

Normal chrome uses outcomes. Advanced stays: Director V2 expert, Adaptive Workspace, Classic editor, worlds, memory/consistency engines, Copilot routing, Instant, orchestrator, movie-builder, providers, brand kits, language exports. “Director” remains the advanced mode name. “AI-regisseur” remains only in Director V2 notes.

---

## 9. Routes explicitly preserved

`/`, `/maak`, `/studio`, `/studio/start`, `/studio/experience`, `/studio/storyboards/*`, `/editor*`, `/motion*`, `/animate*`, `/publish*`, `/library*`, `/projects`, `/videos`, `/account`, `/account/credits`, `/auth/sso/silent`.

No route migration.

---

## 10. Advanced capabilities explicitly preserved

Director V2, Adaptive Workspace, Classic editor, worlds, consistency/memory, Copilot, Instant, orchestrator, production tools, character pipelines, providers, generation controls, Library versioning, brand kits, language exports, multi-version. None deleted.

---

## 11. Files changed

28 files, including glossary + tests, NL/EN i18n, hero/getting-started/experience funnel, landing CTA keys, planet labels, Copilot chrome, PX.1/PX.2 audit docs.

---

## 12. Tests added/updated

Added `src/lib/studio-px2-terminology.test.ts`. Updated i18n, landing, universe CTA/planet, product-suite, marketing-home, client-api-fetch (API middleware scan only; `middleware.ts` untouched), and a DB-gated skip in `refresh-studio-intelligence.test.ts` when `DATABASE_URL` is empty.

---

## 13–16. Quality gates

| Gate | Result |
|------|--------|
| Tests | **4846 pass / 0 fail / 1 skipped** (4847 tests, 838 suites). Skipped test requires `DATABASE_URL`. |
| Lint | **PASS** — 0 errors, 440 pre-existing warnings |
| TypeScript | **PASS** — `tsc --noEmit` |
| Build | **PASS** — `npm run build` (Next.js 16.2.4). Advanced routes still in the route table (`/studio/worlds`, classic storyboards, Instant, etc.). |

---

## 17. Mobile/responsive smoke

Code: mobile quick actions stay `md:hidden`, `min-h-[44px]`, primary CTA full-width. Production HTML nav shows Beelden / Verhalen / Animatie / Video afronden on `/studio`, `/editor`, `/motion`, `/publish`. Home `/` is SSO-gated (unchanged).

---

## 18. SSO/auth regression

No change. `/` still 307 → `/auth/sso/silent?returnTo=%2F&mode=public`. Silent endpoint still 302 to `homecheff.eu/auth/sso/start` with `interaction=silent`. Ontdek/`returnTo=%2F` contract unchanged. Growth not touched.

---

## 19. Credits/billing regression

No change. `/account/credits` still 200. No credit-model or Stripe edits.

---

## 20. Editor/save/publish regression

No change. No editor, autosave, export, or publish pipeline edits. Publish is a label only; `/publish` still 200.

---

## 21. Screens/surfaces inspected

`/`, `/studio`, `/studio/experience`, `/studio/start`, `/studio/storyboards/new`, `/studio/worlds`, `/editor`, `/motion`, `/publish`, `/library`, `/animate/instant`, `/projects`, `/account/credits`, Production i18n chunk `109-jt7qc_377.js`.

---

## 22. Intentionally deferred to PX.3+

- True intent-first Home (collapse five-product orbit)
- One guided creation engine (experience vs story vs Instant)
- HomeCheff listing import / attach / return
- Workspace progressive disclosure redesign
- Route renames
- Remaining advanced “AI-regisseur” notes
- SEO English footer (“Why teams choose… storyboards… publish”)

---

## 23. Risks / remaining naming collisions

- Five suite nav items still look like peer products (labels better; hierarchy not simpler yet).
- SEO/compare footer still English and still says storyboards/publish.
- Mobile motion chip still points at `/animate/instant` (destination preserved on purpose).
- “Studio” is still the product brand and the `/studio` hub; hub label is now Verhalen.

---

## Recommended next PX phase — DO NOT START

**PX.3 — Simple Studio Home:** one obvious next action, intent before tools, without exposing five products as the front door.

No PX.3 implementation without explicit approval.
