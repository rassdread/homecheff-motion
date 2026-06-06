# Pixar Workspace Gap Analysis

**Date:** 2026-06-05  
**Vision:** Single Pixar-style Studio Workspace replacing the tile hub + vertical storyboard stack.

```
Studio
 └ Workspace
     Scene List
     Director Workspace
     Preview Area
     Voice / Music / Sound / Text
     Inspector
     Assets
     Versions
```

---

## Component status matrix

| Pixar component | Current equivalent | Status | Notes |
|-----------------|-------------------|--------|-------|
| **Workspace shell** | `/studio/storyboards/[id]` vertical editor | **MISSING** | No `/studio/workspace` route |
| **Scene List** | `StudioSortableSceneCard` + timeline | **PARTIAL** | Exists but buried under 20+ panels |
| **Director Workspace** | `StudioDirectorPanelV2` | **PARTIAL** | Flag-gated; expert sections partial |
| **Preview Area** | `StudioDirectorScenePreviewStrip` | **PARTIAL** | In V2 only; no workspace layout |
| **Voice** | `StudioVoiceDirectorPanel` + V2 voice section | **PARTIAL** | Storyboard panel + read-only V2 |
| **Music** | `StudioMusicDirectorPanel` + V2 music section | **PARTIAL** | Metadata planning; no audio gen |
| **Sound** | `StudioSoundDirectorPanel` + V2 sound section | **PARTIAL** | Environment/SFX metadata |
| **Text** | `StudioTextBeatsPreviewPanel` + V2 text section | **PARTIAL** | Auto-generated; read-only in V2 |
| **Inspector** | `StudioDirectorInspectorColumn` | **PARTIAL** | Arc/focus/duration only |
| **Assets** | `/studio/assets` + storyboard media panel | **PARTIAL** | Separate page; not in-workspace |
| **Versions** | Motion render versions on project | **PARTIAL** | Studio has no version timeline |
| **Characters sidebar** | Characters library pages | **PARTIAL** | Full CRUD but leaves storyboard |
| **Locations / Props / Worlds** | Full CRUD pages | **COMPLETE** | Not integrated in workspace |
| **QA / Diagnostics** | Production center, consistency panels | **PARTIAL** | Scattered across editor stack |
| **Handoff entry** | Movie builder + editor links | **COMPLETE** | Works; not in workspace nav |

---

## Motion integration

| Flow | Status |
|------|--------|
| Studio → handoff → Motion import | **COMPLETE** |
| Motion source badges per scene | **PARTIAL** — instant wizard only |
| syncTexts protection visibility | **PARTIAL** — Motion side |
| Studio sync back modal | **PARTIAL** |

---

## Version Center (Motion)

| Feature | Status |
|---------|--------|
| Tabs: original, text, full_rerender, languages, drafts | **COMPLETE** |
| Video preview per row | **PARTIAL** |
| Status badges | **MISSING** in Version Center |
| Restore flow | **MISSING** UI (API exists) |
| Compare flow | **MISSING** |
| Timeline links | **MISSING** |

---

## Priority build order (this sprint)

1. `/studio/workspace?storyboardId=` — shell with 3-column layout
2. Director V2 sections — remove placeholder feel (voice preview, plan states)
3. Studio handoff badges in workspace
4. Version Center V2 — badges, restore, timeline
5. Assets sidebar drawer
6. Inspector expansion
7. UX polish + legacy audit

---

## Target scores (post-sprint)

| Area | Current | Target |
|------|---------|--------|
| Workspace | 15 | 70 |
| Director V2 | 55 | 80 |
| Inspector | 40 | 75 |
| Version Center | 50 | 75 |
| Studio→Motion transparency | 60 | 85 |
