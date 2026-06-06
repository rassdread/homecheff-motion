# Deep i18n Audit Report

Audit scope: Motion/Studio user-facing copy on `/`, `/maak`, `/studio`, storyboard workspace, auth flows, toolstrip, director panels, motion handoff, and locale parity. No new features; copy and i18n keys only.

**Validation:** `npm run lint` ✓ · `npm run typecheck` ✓ · `npm run build` ✓ · `npm run test` ✓ (1494/1494)

---

## Gevonden hardcoded teksten

### React components (Studio)

| Locatie | Was | Fix |
|---------|-----|-----|
| `studio-workspace-assets-list.tsx` | `"Worlds"`, `"Production"`, `"Movie builder"` | `t("studio.tools.world")`, `t("studio.workspace.production")`, `t("studio.movieBuilder.title")` |
| `studio-workspace-assets-drawer.tsx` | Zelfde Engelse labels | Zelfde i18n-keys |
| `studio-music-director-panel.tsx` | `"Save failed"` | `t("studio.common.saveFailed")` |
| `studio-sound-director-panel.tsx` | `"Save failed"` | `t("studio.common.saveFailed")` |
| `studio-audio-production-director-panel.tsx` | `"Save failed"` | `t("studio.common.saveFailed" as never)` |
| `studio-audio-asset-director-panel.tsx` | `"Save failed"` | `t("studio.common.saveFailed" as never)` |
| `studio-voice-preview-panel.tsx` | `"Generation failed"` | `t("studio.common.generationFailed")` |

Geen JSX-literals meer gevonden voor: Thumbnail, Inspector, Director Console, Characters, Locations, Story Purpose, Suggest direction (component-scan in `studio-i18n-deep.test.ts`).

### Locale-bestanden (`nl.ts`) — Engelse user copy

Grote clusters met Engels in NL-interface:

- **`studio.directorV2.*`** — shell, inspector, purpose/emotion/camera labels, info-tooltips (deels vertaald; enkele info-voorbeelden bevatten nog loanwords zoals *close-up*, *tracking*, *hero*)
- **`studio.workspace.*`** — classicEditorHint bevatte “Scene Workspace”; backToScenes “Alle scenes”
- **`studio.handoffBadge.*`** — Text beats, Voice/Music/Sound plan, Motion instructions
- **`studio.textBeatsPreview.*`** — Headline, Subheadline, text beats
- **`studio.intelligence.*`** — Story intelligence, Story arc
- **`studio.imagePlanner.title`** — Scene image planner
- **`studio.production.*`** — Voice in score breakdown / cost labels
- **`studio.voiceCenter.preview`**, **`studio.musicPreview.*`** — Preview, Music preview, mood
- **`studio.audioAsset.tab.voice`** — Voice
- **`studio.movieBuilder.dashboard.vision`** — Vision
- **`motion.handoff.checklist.*`** — Voice, Music plan, Sound plan, Text beats

### Locale-bestanden (`en.ts`)

- `studio.directorV2.shell.title`: “Director Console” → **AI director**
- `studio.directorV2.inspector.title`: “Inspector” → **Project analysis**
- `studio.directorV2.section.director`: → **Story direction**
- `studio.directorV2.text.hint`: V46-referentie verwijderd
- `studio.workspace.classicEditorHint`: “Scene Workspace” → **story editor**
- `studio.badge.comingSoon`: “Coming Soon” → **Coming soon**

---

## Gefixte dropdowns/selects

- **Verhaaldoel (story purpose):** NL Introductie/Probleem/Ontdekking/Transformatie/Oplossing/Finale · EN Introduction/Problem/…/Finale (`studio.directorV2.purpose.*`)
- **Emotiekaarten:** NL Blij/Rustig/Enthousiast/Dramatisch/Community/Nieuwsgierig · EN Happy/Calm/… (`studio.directorV2.emotion.card.*`)
- **Camerashots:** NL Breed shot, Medium shot, Close-up, Extreem breed, Detailshot (`studio.directorV2.camera.shot.*`, `studio.director.shot.*`, `studio.storyboards.preset.camera.*`)
- **Modus:** Beginner / Expert (bewust gelijk in beide talen)
- **Audio-asset tab voice:** NL **Stem** (`studio.audioAsset.tab.voice`)
- **Provider types:** NL Stem/Muziek/Geluid (`studio.provider.type.*`)

---

## Gefixte buttons

| Key | NL | EN |
|-----|----|----|
| `studio.common.saveFailed` | Opslaan mislukt. | Could not save. |
| `studio.common.generationFailed` | Genereren mislukt. | Generation failed. |
| `studio.workspace.error.retry` | Opnieuw proberen | Try again |
| `studio.directorV2.director.suggestDirection` | Regie voorstellen | Suggest direction |
| `studio.workspace.openMotion` | Maak video | Make video |
| `studio.movieBuilder.entryButton` | Video samenstellen | Movie Builder |

---

## Gefixte placeholders

- Workspace error- en loading-copy volledig NL (`studio.workspace.error.*`, `studio.workspace.loadingTitle`)
- Classic-editor hint zonder “Workspace”-term (`studio.workspace.classicEditorHint`)
- Motion handoff checklist hint: “scenes” → **scènes** (`motion.handoff.checklist.hint`)

---

## Gefixte Studio panels

| Panel | Wijziging |
|-------|-----------|
| **AI-regisseur (Director V2)** | NL titels: AI-regisseur, Projectanalyse, Verhaaldoel, Verhaalregie; EN: AI director, Project analysis, Story purpose, Story direction |
| **Workspace inspector** | Handoff → “Klaar voor Motion”; stem/muziek/geluid/tekst via bestaande NL keys |
| **Assets drawer/list** | Wereld, Productie, Video samenstellen i.p.v. hardcoded Engels |
| **Text beats preview** | NL koptekst/subkop/tekstregels |
| **Music/voice preview** | NL Voorbeeld, Muziekvoorbeeld, Muziekplan |
| **Production center (NL)** | Productiecentrum; Voice → Stem in kosten/samenvatting |
| **Handoff badges** | NL Tekstregels, Stemplan, Muziekplan, Geluidplan |

---

## Gefixte Motion/video teksten

- `motion.handoff.checklist.*` — checklistlabels NL
- `motion.handoff.textBeats.headline/subheadline` — Koptekst / Subkop
- `studio.sourceBadge.studioSource` — “Uit storyboard” → **Vanuit Studio**
- `maak.*`, `studio.start.*`, `studio.shell.*` — reeds canoniek (vorige fase); parity-test groen

---

## Bewuste uitzonderingen

| Term | Reden |
|------|--------|
| **HomeCheff**, **Motion**, **Studio**, **AI** | Merknamen |
| **Props** | Productterm (user-spec) |
| **Close-up**, **Medium shot**, **Finale**, **Community** | Internationaal filmjargon; gelijk in NL/EN waar bedoeld |
| **Beginner** / **Expert** | User-glossary: gelijk in beide talen |
| **Tracking**, **Crane**, **Hero** (placement/compositie) | Technische filmtermen in geavanceerde/admin panels |
| **storyboard** (kleine letters) | Interne route/API-naam in enkele NL hints (“Terug naar storyboard”) — geen user-facing tablabel |
| **V11** in `studio.consistency.methodHint` | Admin/debug context |
| **chars** (`studio.workspace.charactersShort`) | Compacte UI-afkorting |
| **Render**, **sync**, **handoff** in developer-only keys | Niet in primaire Studio-toolstrip getest |

Build-SHA/debug badge: niet gewijzigd; blijft achter debug/admin flags (`debug-ui.test.ts`).

---

## Toegevoegde tests

| Test | Bestand | Wat |
|------|---------|-----|
| Locale parity (studio prefixes) | `studio-i18n-deep.test.ts` | `studio.shell/start/tools/workspace/directorV2/maak` keys gelijk in nl/en |
| Canonieke director labels | idem | AI-regisseur / AI director, Verhaaldoel / Story purpose, … |
| Option labels | idem | purpose, emotion, camera, status |
| Forbidden EN in NL studio strings | idem | Characters, Inspector, Workspace, … |
| Forbidden NL in EN studio strings | idem | Personages, Verhaaleditor, … |
| Hardcoded component scan | idem | Studio `.tsx` zonder Save failed, Thumbnail JSX, … |
| Bestaand | `i18n-locale-parity.test.ts` | Volledige nl ↔ en key parity |
| Bestaand | `studio-i18n-consistency.test.ts` | Toolstrip + canonical start/shell/maak |
| E2E fix | `e2e/studio-smoke.spec.ts` | `.first()` op dubbele “Mijn videoverhalen”-link |

Nieuwe test toegevoegd aan `package.json` test script.

---

## Resterende twijfelgevallen

1. **`studio.directorV2.info.*` (NL)** — veel info-tooltips bevatten nog Engelse loanwords (*shot*, *prompt*, *hero*, *tracking*). Functioneel NL; volledige vertaling kan copy verduidelijken maar is niet blocker voor toolstrip/workspace.
2. **`studio.production.*` / `studio.audioAsset.*` / `studio.intelligence.*`** — diepere productie-/admin panels: deels gemengd NL/EN (bijv. “Story health”, “Shotplan”, “Vision” tab). Zichtbaar alleen in advanced/production mode.
3. **`studio.consistency.status.needs_review`** — “Review nodig” i.p.v. user-glossary “Nog werk nodig”; andere context dan `aiAssistant.readiness.level.needsWork`.
4. **`studio.jobs.status.running`** — EN “Running” i.p.v. glossary “In progress”; NL “Bezig” ✓.
5. **`motion.qa.readiness.tier.*`** — nog “Review nodig” / “Vision”; Motion QA-scherm.
6. **Camera loanwords** — Close-up / Medium shot bewust gelijk; “Detailshot” NL vs EN “Detail shot” (spelling).
7. **E2E locale smoke** — forbidden-term tests zijn unit/locale-level; browser NL/EN switch smoke kan later in Playwright (`?lang=` of cookie).

---

*Generated as part of P0 deep i18n cleanup — no new Studio features.*
