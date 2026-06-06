# Workspace UX Masterplan

**Date:** 2026-06-05  
**Input:** `docs/workspace-ux-friction-audit.md` (codebase truth on `main`)  
**Constraint:** Plan only — no code in this document.

---

## Doel

HomeCheff Motion Studio moet voelen als **één product** met drie duidelijke ruimtes:

1. **Studio** — plannen (scenes, director, assets)
2. **Motion** — renderen (wizard)
3. **Videos** — beheren (playback, versions, download)

De gebruiker mag niet hoeven te weten wat “handoff”, “full rerender”, of “Pixar Workspace” betekent.

---

## Strategische keuzes

| Keuze | Rationale |
|-------|-----------|
| **Workspace wordt default Studio editor** | Classic 15-panel stack is #1 scroll friction (`studio-storyboard-editor.tsx`) |
| **Classic editor wordt “Advanced storyboard”** | Behouden voor power users / jobs / corrections |
| **Motion wizard wordt import-aware** | Studio handoff → hide duplicate style/mood/prompt |
| **Video detail = één recovery card** | `RenderActivityStatusCard` primary; progress panel pipeline-only |
| **Version Center = single source of truth** | Inline `VideoVersionsPanel` wordt samenvatting + link |

---

## Wijzigingen per thema

### 1. Terminologie & copy (P0)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| `studio.workspace.label` → “Scene workspace” | Minder verwarring, professioneler | Laag | Hoog | `en.ts`, `nl.ts` |
| `studio.workspace.classicEditor` → “Advanced editor” | Minder negatieve connotatie | Laag | Medium | i18n |
| Unified “Render” (niet Generate) | Consistente taal | Laag | Medium | `instant-wizard-flow.ts` keys, footer |
| Version tab labels vereenvoudigen | Begrijpelijke versions | Laag | Hoog | `version-center-tabs.ts`, i18n |
| User copy voor text protection | syncTexts begrijpelijk | Medium | Hoog | `motion-scene-source-badges`, text step hint |

**Verwachte winst:** −40% support-vragen over termen (schatting).

---

### 2. Studio entry & workspace default (P0)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| Na storyboard create → redirect workspace | −1 scherm scroll, direct scene focus | Medium | Zeer hoog | `storyboards/new`, `studio-storyboards-library` |
| Studio hub card → laatste storyboard workspace | Minder dead-end op storyboards list | Laag | Medium | `studio/page.tsx` |
| Workspace zonder `storyboardId` → picker | Geen error page | Laag | Medium | `workspace/page.tsx` |
| Header: primary CTA “Render in Motion” | Duidelijke volgende stap | Laag | Hoog | `studio-workspace-shell.tsx` |

**Verwachte winst:** Studio-first pad −3 minuten tot eerste scene edit (schatting).

---

### 3. Classic editor de-emphasis (P1)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| Collapse storyboard panels default closed | Minder scroll | Medium | Hoog | `studio-storyboard-editor.tsx` |
| Banner: “Open scene workspace for daily editing” | Routing clarity | Laag | Medium | editor header |
| Jobs/corrections blijven in classic | Geen feature loss | Laag | Medium | unchanged panels |

**Risico:** Power users missen panels — mitigate via “Expand all planning panels” toggle.

---

### 4. Workspace inspector dedup (P1)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| Remove embedded `StudioDirectorInspectorColumn` from Director panel in workspace context | Geen dubbele arc/focus | Laag | Medium | `studio-director-panel-v2.tsx` prop `hideInlineInspector` |
| Inspector right = single column | Cleaner layout | Laag | High | `studio-workspace-inspector-panel.tsx` |

---

### 5. Director V2 beginner/expert alignment (P1)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| Beginner: voice/music/sound als read-only summaries | Geen hidden expert value | Laag | Medium | `studio-director-panel-v2.tsx` |
| Sticky save bar | Minder vergeten saves | Laag | Medium | panel v2 |
| Rename “Director Console” | Minder jargon | Laag | Low | i18n |

---

### 6. Motion wizard simplification (P0–P1)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| `hasStudioHandoff` → skip expert style/mood/prompt steps | Geen dubbele instellingen | Medium | Zeer hoog | `instant-wizard-flow.ts`, `instant/page.tsx` |
| Intelligence panel alleen bij warnings | Minder noise | Laag | High | `instant/page.tsx` |
| Single import banner | Minder duplicate UI | Laag | Low | `instant/page.tsx` |
| Pre-render QA: non-blocking default | Sneller eerste render | Medium | High | `MotionPreRenderQaModal` usage |

**Bestanden:** `src/lib/instant-wizard-flow.ts`, `src/app/animate/instant/page.tsx`, `src/components/instant/motion/*`

---

### 7. Video detail recovery consolidation (P0)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| `showInstantProgress` + activity card → no repair card overlap | Eén recovery UX | Low | High | `videos/[id]/page.tsx` |
| Versions: compact card + “All versions →” | Minder duplicate | Low | Medium | `video-versions-panel.tsx` |

---

### 8. Version Center clarity (P0)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| Tab intro sentences | Eerste bezoek begrijpelijk | Laag | High | `version-center-page.tsx`, i18n |
| Localized status map | Geen raw `completed` | Laag | Medium | new `version-status-display.ts` |
| Inline diff panel (reuse render-history API) | Compare zonder twee tabs | Medium | High | `version-center-page.tsx`, `render-history-panel.tsx` logic |

---

### 9. Mobile (P1)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| Workspace inspector bottom sheet | Inspector bereikbaar op mobile | Medium | High | new `studio-workspace-inspector-sheet.tsx` |
| Nav “More” drawer | Geen horizontal scroll | Low | Medium | `app-shell-primary-nav.tsx` |

---

### 10. Homepage (P0)

| Wijziging | UX winst | Risico | Impact | Bestanden |
|-----------|----------|--------|--------|-----------|
| Secondary CTA: Discover → Pricing of Create | Geen dead-end | Laag | Medium | `home-ecosystem-page.tsx` |
| Flow step mention “Scene workspace” | Workspace discoverability | Laag | Low | i18n `landing.flow` |

---

## Implementatievolgorde (aanbevolen)

```
Week 1 (P0 copy + routing)
  → Terminologie i18n
  → Workspace default redirect
  → Motion handoff-aware wizard steps
  → Version Center tab intros + status labels

Week 2 (P0 recovery + dedup)
  → Video detail recovery merge
  → Workspace inspector dedup
  → Homepage CTA fix

Week 3 (P1)
  → Classic editor collapse
  → Mobile inspector sheet
  → Version inline diff
```

---

## Succescriteria

| Metric | Huidig (geschat) | Doel |
|--------|------------------|------|
| Studio-first klikken tot render | ~11 + scroll | ≤7 |
| Onduidelijke termen in core flow | ~12 | ≤3 |
| Duplicate panels in active render | 3 | 1 |
| Time-to-first-render (Motion-fast) | ~5 min | ≤3 min |
| Workspace adoption | Opt-in knop | Default path |

---

## Niet in scope (bewust)

- Nieuwe render engine
- Generated music/SFX playback
- Marketplace build
- Database migrations
- Director V2 flag removal (pas na workspace default stable)

---

*Uitvoering: zie `docs/workspace-next-sprint.md` voor eerste 10 concrete items.*
