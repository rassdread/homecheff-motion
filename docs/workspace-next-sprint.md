# Workspace Next Sprint

**Date:** 2026-06-05  
**Input:** `docs/workspace-ux-friction-audit.md` + `docs/workspace-ux-masterplan.md`  
**Max:** 10 items — gesorteerd op **hoogste UX winst / laagste ontwikkeltijd**.

---

## Sprint items

| # | Item | UX winst | Effort | Bestanden | Acceptatie |
|---|------|----------|--------|-----------|------------|
| 1 | **Rename “Pixar Workspace” → “Scene workspace”** (+ NL) | Hoog — professionele taal | **S** | `en.ts`, `nl.ts` | Geen “Pixar” in UI |
| 2 | **Version Center: localized status labels** (`completed` → “Klaar”) | Hoog — begrijpelijke status | **S** | `version-center-page.tsx`, new `lib/version-status-label.ts`, i18n | Geen raw API strings |
| 3 | **Version Center: 1-zin tab intro** boven tab bar | Hoog — eerste bezoek | **S** | `version-center-page.tsx`, i18n (`versions.center.tabIntro.*`) | Elke tab heeft uitleg |
| 4 | **Motion: hide expert style/mood/prompt when Studio handoff loaded** | Zeer hoog — geen dubbele settings | **M** | `instant-wizard-flow.ts`, `instant/page.tsx`, `readPersistedWizardState()` | Handoff import → 4-step beginner path only |
| 5 | **Redirect new storyboard → workspace** | Zeer hoog — default workspace | **S** | `storyboards/new/page.tsx` of client redirect na create | Create landt op `/studio/workspace?storyboardId=` |
| 6 | **Workspace: storyboard picker** when no `storyboardId` | Medium — geen dead-end | **M** | `workspace/page.tsx`, reuse `StudioStoryboardsLibrary` compact | Lijst recente storyboards |
| 7 | **Video detail: hide `InstantVideoRepairCard` when activity card visible** | Hoog — één recovery | **S** | `videos/[id]/page.tsx` | Max 1 amber repair panel during render |
| 8 | **Workspace: `hideInlineInspector` on Director panel** | Medium — geen dubbele arc/focus | **S** | `studio-director-panel-v2.tsx`, `studio-workspace-shell.tsx` | Inspector alleen rechts |
| 9 | **Motion text step: uitleg “Locked text / From Studio”** | Hoog — syncTexts begrijpelijk | **S** | i18n + `motion-scene-source-badges.tsx` tooltip | 1 help link in text step |
| 10 | **Homepage: secondary CTA Discover → Create** | Medium — geen placeholder dead-end | **S** | `home-ecosystem-page.tsx` | Secundaire knop gaat niet naar lege discover |

**Effort:** S = <2u, M = 2–6u

---

## Niet in deze sprint (volgende batch)

- Classic editor panel collapse (M–L)
- Version inline diff panel (M)
- Mobile inspector bottom sheet (M)
- Scene DnD in workspace (M)
- Full terminologie pass (full rerender rename everywhere) (M)

---

## QA checklist per item

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Hand-test: storyboard create → workspace → motion import → render
- [ ] Hand-test: version center tabs + restore
- [ ] Hand-test: video detail during active render (single recovery)

---

## Commit-voorstel (kleine commits)

1. `fix(i18n): rename Pixar Workspace to Scene workspace`
2. `feat(versions): localized status labels and tab intros`
3. `feat(motion): skip expert wizard steps when studio handoff loaded`
4. `feat(workspace): default redirect and storyboard picker`
5. `fix(videos): consolidate recovery panels during active render`
6. `fix(workspace): dedupe inline director inspector`
7. `feat(motion): explain studio source and locked text in wizard`
8. `fix(landing): point secondary CTA to create not discover`

---

## Verwacht resultaat na sprint

- Nieuwe gebruiker: **Studio → Workspace → Motion → Video** zonder Pixar-jargon
- Eerste render met Studio import: **geen dubbele style/mood stappen**
- Version Center: **begrijpelijke tabs en status**
- Actieve render: **één recovery surface**
- Homepage: **geen discover dead-end**

Geschatte UX score verbetering: **68 → 76** (zie `pixar-workspace-final-audit.md` baseline).
