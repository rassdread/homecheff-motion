# Workspace UX Friction Audit

**Date:** 2026-06-05  
**Method:** New-user lens on current `main` codebase — not prior audit docs.  
**Scope:** Homepage → Studio → Workspace → Motion → Render → Versions → Download.

---

## Phase 1 — Volledige gebruikersreis

### Pad A: Studio-first (aanbevolen op homepage)

| # | Scherm | Route | Bewijs |
|---|--------|-------|--------|
| 1 | Homepage | `/` | `src/app/page.tsx` → `HomeEcosystemPage` |
| 2 | Studio hub | `/studio` | 8 feature cards incl. Pixar Workspace → storyboards |
| 3 | Storyboards lijst | `/studio/storyboards` | `StudioStoryboardsLibrary` |
| 4 | Nieuw storyboard | `/studio/storyboards/new` | form + redirect naar editor |
| 5 | Classic storyboard editor | `/studio/storyboards/[id]` | `StudioStoryboardEditor` — **15+ panels vóór scene list** |
| 6 | (Optioneel) Pixar Workspace | `/studio/workspace?storyboardId=` | Alleen via knop in editor — niet default |
| 7 | Handoff loader | `/animate/instant/import?storyboardId=` | auto-redirect, geen bevestiging UI |
| 8 | Motion wizard | `/animate/instant` | 4 stappen beginner / 5 expert |
| 9 | Render / progress | `/videos/[id]` of `/animate/instant/progress` | twee parallelle UX-paden |
| 10 | Video detail | `/videos/[id]` | ~1600 regels, meerdere recovery panels |
| 11 | Version Center | `/videos/[id]/versions` | 5 tabs |
| 12 | Download | API link op detail of versions | `animationProjectDownloadUrl` |

**Schermen (minimum Studio-pad):** 10–12 unieke schermen  
**Schermen (met Workspace + progress page):** 13–14

### Pad B: Motion-fast (zonder Studio)

| # | Scherm | Route |
|---|--------|-------|
| 1 | Homepage of Create | `/` of `/create` |
| 2 | Motion wizard | `/animate/instant` |
| 3 | Video detail | `/videos/[id]` |
| 4 | Download | via detail |

**Schermen:** 4–5

### Klikken (geschat, Studio-first)

| Actie | Klikken |
|-------|---------|
| Nav: Home → Studio → Storyboards → Open | 3 |
| Workspace (optioneel) | +1 |
| Open in Motion (editor of workspace header) | +1 |
| Import (automatisch) | 0 |
| Wizard beginner: 4 stappen (3× Next + Generate) | 3–4 |
| Na render: naar versions + download | 2 |
| **Totaal** | **~9–11** (excl. login, scene editing, scroll) |

### Scroll-acties (friction)

| Locatie | Scroll-impact | Bewijs |
|---------|---------------|--------|
| Classic storyboard editor | **Zeer hoog** — 15 storyboard-level panels vóór scenes | `studio-storyboard-editor.tsx` L702–758 |
| Workspace Director V2 | **Hoog** — 5–9 accordion secties + inspector | `studio-director-panel-v2.tsx` |
| Motion wizard | **Hoog** — upload + storyboard + text + expert panels | `instant/page.tsx` ~2300 regels |
| Video detail | **Hoog** — cost card, recovery, versions, player, bundle | `videos/[id]/page.tsx` |
| Primary nav (mobile) | Horizontale scroll | `app-shell-primary-nav.tsx` L75 `overflow-x-auto` |

### Onduidelijke termen (nieuwe gebruiker)

| Term | Waar | Probleem |
|------|------|----------|
| **Pixar Workspace** | `studio.workspace.label` | Interne codenaam; gebruiker verwacht geen Pixar-branding |
| **Classic editor** | Workspace header link | Impliceert dat workspace “nieuw/goed” is, classic “oud” |
| **Director Console** | Director V2 shell | Filmjargon zonder onboarding |
| **Handoff** | import route, badges | Technisch; niet in UI-labels maar wel in docs/dev |
| **Full rerender** | versions tab, editors | Engels jargon |
| **Render version** | Version Center rows `V{n}` | Verschil met “video” onduidelijk |
| **syncTexts** | Motion badges (protected) | Nooit uitgelegd in UI |
| **Expert / Beginner** | Wizard + Director V2 | Twee verschillende mode-systemen |
| **Production** | Workspace + storyboard links | Onderscheid movie-builder / production center / readiness onduidelijk |

### Dubbele informatie (zelfde data, meerdere plekken)

| Data | Locaties |
|------|----------|
| Voice / music / sound planning | Classic editor panels + Director V2 expert + Workspace inspector summaries |
| Story intelligence / arc | `StudioStoryIntelligencePanel` + workspace inspector story health |
| Scene text beats | `StudioTextBeatsPreviewPanel` + Director V2 text + Motion wizard text step |
| Version history | `/videos/[id]/versions` + `VideoVersionsPanel` op detail + toolbar |
| Render progress / recovery | `RenderActivityStatusCard` + `InstantFinalProgressPanel` + `InstantVideoRepairCard` |
| Studio QA / readiness | `MotionStudioIntelligencePanel` in wizard + `MotionPreRenderQaModal` + Studio production center |

---

## Phase 2 — Pixar Workspace audit (`/studio/workspace`)

**Bewijs:** `src/app/studio/workspace/page.tsx`, `studio-workspace-shell.tsx`, `studio-director-panel-v2.tsx`

### 1. Voelt dit als een filmstudio?

**Gedeeltelijk.** Scene list + preview strip + Director accordion suggereren een console, maar:
- Geen timeline/track view
- Geen daadwerkelijke video/audio preview (alleen scene still)
- Label “Pixar Workspace” breekt immersion (productnaam i.p.v. “Scene workspace”)

### 2. Voelt dit als een dashboard?

**Ja, deels.** Inspector rechts met scores/warnings (`studio-workspace-inspector-panel.tsx`) voelt als analytics dashboard naast editor.

### 3. Wat ontbreekt nog?

- Default entry (vereist `?storyboardId=` — `workspace/page.tsx` toont fout zonder param)
- Scene image editing tab (alleen in classic `StudioSceneComposer` compose/image/prompt tabs)
- Drag-reorder scenes (wel in classic editor, niet in workspace sidebar)
- Duidelijke “volgende stap”: handoff vs production vs render

### 4. Wat is overbodig?

- **Dubbele inspector:** `StudioDirectorInspectorColumn` inside Director panel (L348) **én** `StudioWorkspaceInspectorPanel` in right column — arc/focus/emotion twice
- Asset nav items “Versions” → linkt naar production/movie-builder, niet echte version timeline
- Classic editor link in header terwijl user net workspace koos

### 5. Wat leidt af?

- 7 nav items in linker sidebar (scenes + 6 asset types) — wisselen verbergt scene list
- Expert-only voice/music/sound — beginner mode in workspace toont die niet, maar inspector toont wél voice/music summaries
- Mobile: list ↔ editor toggle verbergt inspector (`lg:block` only on right column)

### Component status

| Onderdeel | Status | Bewijs |
|-----------|--------|--------|
| **Scene List** | PARTIAL | `studio-workspace-scene-sidebar.tsx` — compact, geen DnD, geen delete |
| **Preview Strip** | PARTIAL | `studio-director-scene-preview-strip.tsx` — still only |
| **Director** | PARTIAL | V2 panel volledig in center; storyboard notes apart |
| **Voice** | PARTIAL | Expert-only accordion; preview per character (`voice-section.tsx`) |
| **Music** | PARTIAL | Cue cards + plan state; geen audio |
| **Sound** | PARTIAL | Environment cards + plan state; geen audio |
| **Text** | PARTIAL | Read-only beats + studio source badge |
| **Inspector** | PARTIAL | Rich summaries maar overlap met Director inspector column |
| **Assets** | PARTIAL | `studio-workspace-assets-list.tsx` — links naar full CRUD pages, verlaat workspace |

---

## Phase 3 — Director V2 UX audit

**Bewijs:** `src/components/studio/director-v2/sections/*.tsx`, `studio-director-panel-v2.tsx`

| Sectie | Begrijpelijk? | Te technisch? | Verborgen? | Uitleg? | Te veel opties? |
|--------|---------------|---------------|------------|---------|----------------|
| **Director** | Ja | Matig | Nee (beginner open) | Info buttons | Nee |
| **Characters** | Ja | Nee | Nee | Ja | Nee bij kleine cast |
| **Camera** | Matig | Ja — shot types, motion cards | Nee | Info buttons | Ja — alle shot types in advanced line |
| **Emotion** | Ja | Matig | Nee | Cards helpen | Nee |
| **Text** | Matig | Ja — “V46 beats” hint | Nee | Hint only | N/A read-only |
| **Voice** | Matig | Ja — language tabs | **Ja — expert only** | Edit hint links weg | Per character OK |
| **Music** | Matig | Ja — cue type enums | **Ja — expert only** | Plan state helps | Many cue cards |
| **Sound** | Matig | Ja — environment IDs | **Ja — expert only** | Plan state helps | Many env cards |
| **Advanced** | Nee | **Ja** — prompt inspector, motion summary | **Ja — expert only** | Read-only hint | Te veel voor beginner |

### Aanbevelingen (geen bouw)

1. Eén mode-systeem: workspace beginner = wizard beginner (nu twee localStorage keys)
2. Voice/music/sound in beginner tonen als **samenvatting**, niet verbergen
3. “Save scene” onderaan — gebruiker vergeet save na accordion edits
4. Vervang “Director Console” → “Scene director” of “Scene settings”
5. Camera: default 4 cards, “more shots” collapsed

---

## Phase 4 — Motion wizard audit (`/animate/instant`)

**Bewijs:** `instant-wizard-flow.ts`, `instant/page.tsx`

### Kan iemand binnen 5 minuten renderen?

**Ja, op Motion-fast pad** (2+ images, beginner, geen Studio):
- Upload → storyboard order → text (optioneel) → generate ≈ 4 stappen
- **Maar:** OCR scan gate, pricing strip, pre-render QA modal kunnen vertragen
- **Studio import pad:** + handoff + intelligence panels = **>5 min** waarschijnlijk

### Verwarrende stappen

| Stap | Probleem |
|------|----------|
| Upload + storyboard merge | Beginner transition mode: “frame order” vs “storyboard” naming switch |
| Text step | Studio-imported text + manual override + badges — drie concepten tegelijk |
| Expert style/mood/prompt | Overlapt Studio director profile / mood — gebruiker weet niet waar “waarheid” ligt |
| Generate | `MotionPreRenderQaModal` + readiness warnings — extra gate |
| Expert panels always visible | `AdvancedCreatorSettingsPanel` + `MotionStudioIntelligencePanel` on upload step when handoff |

### KEEP / SIMPLIFY / MOVE TO STUDIO / REMOVE

| Item | Actie | Reden |
|------|-------|-------|
| Upload + min images | **KEEP** | Core |
| Beginner 4-step flow | **KEEP** | Goed pad |
| Storyboard reorder | **KEEP** (transition) | Nodig |
| Text per scene | **SIMPLIFY** | Default collapsed als Studio sync |
| Animation style (expert) | **MOVE TO STUDIO** | `promptStyleProfile` bestaat al |
| Mood (expert) | **MOVE TO STUDIO** | `StudioMusicDirector` overlap |
| Expert prompt step | **SIMPLIFY** | Merge in text step |
| `MotionStudioIntelligencePanel` | **SIMPLIFY** | Alleen tonen bij Studio import of warnings |
| `AdvancedCreatorSettingsPanel` | **REMOVE** from default view | Admin-only |
| `MotionAudioExportWizardSettings` | **MOVE TO STUDIO** | Audio export hoort bij storyboard |
| Duplicate `MotionImportSummaryBanner` | **SIMPLIFY** | Twee mount points in page (~L1721, ~L1929) |

---

## Phase 5 — Version Center audit (`/videos/[id]/versions`)

**Bewijs:** `version-center-page.tsx`, `version-center-tabs.ts`

### Begrijpt de gebruiker…?

| Concept | Begrijpelijk? | Probleem |
|---------|---------------|----------|
| **Render versions** | Matig | Label `V{n}` + status raw English (`completed`) |
| **Text versions** | Zwak | Tab “Text versions” — verschil met “edit text on same render” onduidelijk |
| **Full rerenders** | Zwak | “Full rerender” klinkt als bugfix, niet creatieve keuze |
| **Language versions** | Matig | OK als user i18n snapt |
| **Drafts** | Matig | Bundle peers + draft lineage — twee bronnen in één tab |

### Termen vereenvoudigen

| Huidig | Voorstel |
|--------|----------|
| Full rerender | **Nieuwe video van alle beelden** / “Rebuild all scenes” |
| Text versions | **Tekstwijzigingen** |
| Render version | **Versie** |
| Restore | **Maak actief** |
| Default badge “Current” | **Actieve versie** |

### Ontbrekende UX

- Geen inline diff (alleen compare hint met links)
- Geen uitleg per tab (eerste bezoek empty state is generiek)
- Status badges tonen raw API status strings
- “Open editor” vs “Open” verschil niet uitgelegd

---

## Phase 6 — Terminologie audit

| Term | EN label key | Duidelijk | Actie |
|------|--------------|-----------|-------|
| Storyboard | `studio.feature.storyboards` | ✓ | Behoud |
| Pixar Workspace | `studio.workspace.label` | ✗ | **Vervang** → “Scene workspace” |
| Director / Director Console | `studio.directorV2.shell.title` | △ | **Vervang** → “Scene director” |
| Scene | consistent | ✓ | Behoud |
| Motion | `nav.motion` | ✓ | Behoud |
| Render / Generate | mixed (`creatorStep.generate` vs `wizardStep.generate`) | ✗ | **Eén woord**: “Render” |
| Text version | `versions.center.tab.text` | △ | **Vereenvoudig** |
| Full rerender | `versions.center.tab.full_rerender` | ✗ | **Vervang** |
| Draft | `versions.center.tab.drafts` | △ | Tooltip toevoegen (conceptueel) |
| Language version | `versions.center.tab.languages` | ✓ | Behoud |
| Studio source | `studio.handoffBadge.studioSource` | △ | **“From Studio”** |
| Motion override | `motion.sceneBadge.manualText` | △ | **“Edited in Motion”** |
| Protected / text protected | `motion.sceneBadge.textProtected` | ✗ | **“Locked text”** + uitleg sync |
| syncTexts | niet in UI | ✗ | User-facing: “Keep my text edits” |
| Classic editor | `studio.workspace.classicEditor` | ✗ | **“Full storyboard editor”** |
| Production | `studio.workspace.production` | △ | **“Ready to render”** |
| Beginner / Expert | wizard + director | △ | **“Simple / Advanced”** |

### Consistente terminologie (voorstel)

- **Studio** = plannen (characters, scenes, director)
- **Motion** = renderen (wizard)
- **Videos** = bibliotheek
- **Versions** = geschiedenis per video
- Geen “Pixar”, “handoff”, “rerender” in user-facing copy

---

## Phase 7 — Duplicatie audit

### SAFE TO MERGE

| A | B | Bewijs |
|---|---|--------|
| `StudioDirectorInspectorColumn` | `StudioWorkspaceInspectorPanel` arc/focus block | Both show arc, focus, emotion — workspace wraps inspector + adds more |
| `MotionImportSummaryBanner` duplicate mounts | single banner | `instant/page.tsx` two branches |
| Version toolbar on detail | link-only to Version Center | `project-detail-version-toolbar` + full page |
| Progress page recovery | video detail recovery | Same components pattern |

### SAFE TO REMOVE (from default UX, not code yet)

| Item | Bewijs |
|------|--------|
| Storyboard-level panels when workspace is primary | 15 panels `studio-storyboard-editor.tsx` L702–758 |
| `InstantFinalProgressPanel` when `RenderActivityStatusCard` shown | `videos/[id]/page.tsx` L1055–1107 — `compactProgressOnly` helps but still dual |
| Expert wizard style/mood when Studio import | Data already in handoff payload |

### INVESTIGATE

| Item | Risico |
|------|--------|
| `/animate/instant/progress` vs `/videos/[id]` | Bookmarks, Stripe return URLs |
| `VideoVersionsPanel` on detail vs Version Center | Power users may rely on inline panel |
| Classic editor vs workspace | Feature flag `NEXT_PUBLIC_STUDIO_DIRECTOR_V2` only affects compose tab in classic |
| Two asset libraries | `studio-asset-library` vs `studio-audio-asset-library` |

---

## Phase 8 — Mobile audit

| Surface | Issue | Bewijs |
|---------|-------|--------|
| **Primary nav** | 7+ items horizontal scroll | `overflow-x-auto`, `text-[11px]` |
| **Studio hub** | 8 cards — long scroll | `studio/page.tsx` grid |
| **Classic editor** | Unusable depth — panels + scenes | Vertical stack |
| **Workspace** | Inspector hidden on mobile in editor pane | right column `hidden lg:block` on list mode only — inspector shows in editor mode but below fold |
| **Workspace** | Asset drawer 70vh overlay | `studio-workspace-assets-drawer.tsx` |
| **Motion wizard** | ~2300 line page, many panels | Full scroll form |
| **Video detail** | Many stacked cards | recovery + player + versions |
| **Version Center** | Tab bar `overflow-x-auto` | `version-center-page.tsx` |
| **Admin analytics** | Wide tables, export button row | `render-analytics-dashboard.tsx` |

### Mobile verbeteringen (aanbevelingen)

1. Bottom nav: Studio | Motion | Videos | Create (max 4)
2. Workspace mobile: sticky scene title + save; inspector as bottom sheet tab
3. Touch targets: wizard footer buttons ≥44px (check `InstantWizardFooter`)
4. Version Center: single column OK; tabs → dropdown on xs
5. Reduce horizontal scroll on nav — “More” menu

---

## Phase 9 — Homepage audit

**Bewijs:** `home-ecosystem-page.tsx`, `app-shell-primary-nav.tsx`

| Vraag | Antwoord |
|-------|----------|
| Direct duidelijk wat HomeCheff is? | **Gedeeltelijk** — “AI production ecosystem” is abstract; Motion/Studio pas in subcopy |
| Direct duidelijk wat Motion is? | **Ja** — showcase card + ecosystem pill |
| Direct duidelijk wat Studio is? | **Matig** — “storyboards, characters & directors” — geen workspace mention |
| Navigatie logisch? | **Matig** — Discover/Create/Studio/Motion/Videos/Pricing/About; Discover is placeholder |

### Verbeteringen

1. Hero CTA “Start creating” → `/create` is goed; secundair “Explore discover” leidt naar lege marketplace — **verwarring**
2. Flow sectie (4 stappen) aligneert met Studio→Motion — **goed**
3. Pixar Workspace niet genoemd op homepage — user vindt het alleen via storyboard editor
4. Ecosystem pills: HomeGarden/HomeDesigner “coming soon” — kan afleiden van focus
5. Voeg één diagram toe: Studio plan → Motion render → Videos library (tekst bestaat in `landing.flow`)

---

## Phase 10 — Prioriteitenlijst

### P0 — Vóór publieke lancering

1. **Terminologie:** verwijder “Pixar Workspace”, unify Render/Generate, vereenvoudig Full rerender / Text versions
2. **Workspace default entry:** open workspace na storyboard create/open (niet classic 15-panel stack)
3. **Motion wizard:** hide expert style/mood/prompt when Studio handoff imported
4. **Video detail recovery:** één zichtbare recovery surface voor actieve render
5. **Version Center:** localized status labels + 1-zin uitleg per tab
6. **Homepage:** verwijder of relabel Discover CTA tot marketplace bestaat
7. **syncTexts / protected text:** user-facing uitleg in Motion text step

### P1 — Belangrijke verbetering

1. Merge duplicate inspectors in workspace
2. Scene DnD in workspace sidebar
3. Scene image tab in workspace (from composer)
4. Wizard: single `MotionImportSummaryBanner`, intelligence panel only on warnings
5. Version compare inline (use existing API)
6. Mobile bottom nav + workspace inspector sheet
7. Director V2: voice/music/sound summary in beginner mode

### P2 — Later

1. Timeline view in workspace
2. Inline audio preview for music/sound plans
3. Marketplace / Discover
4. Redirect `/animate` legacy routes
5. Admin analytics mobile layout
6. Remove classic editor panel stack entirely

---

*Vervolg: `docs/workspace-ux-masterplan.md`, `docs/workspace-next-sprint.md`*
