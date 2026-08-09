# Studio Canonical Workspace Architecture (S.6C)

**Status:** Architecture freeze — no UI redesign in S.6C  
**Canonical URL:** `/studio?storyboardId=` (`studio-workspace-href` / ADR-STUDIO-003)  
**Shell:** Adaptive Workspace (S.2) — `StudioWorkspaceShell`

---

## 1. Principle

The Adaptive Workspace is the **primary creative surface**.  
Classic / Movie Builder / Production / Editor Fusion remain reachable; they do not redefine Continuity ownership.

**No redesign in S.6C** — this document freezes information architecture for future work.

---

## 2. Desktop IA (canonical)

```
┌─────────────┬──────────────────────────────┬─────────────────┐
│ LEFT RAIL   │ CENTER WORKSPACE             │ RIGHT INSPECTOR │
│ Hierarchy   │ Creative work                │ Context editing │
│ & libraries │                              │                 │
├─────────────┴──────────────────────────────┴─────────────────┤
│ BOTTOM BAR — Generation queue · Jobs · Render · Exports · Uploads │
└──────────────────────────────────────────────────────────────┘
```

### Left Rail (project + library hierarchy)

| Item | Role | Continuity |
|------|------|------------|
| Projects | `StudioCreativeProject` / entry | Container |
| Storyboards | Active storyboard list/switch | Storyboard continuity |
| Scenes | Ordered scene list | Scene selection |
| Characters | Library + scene attach | Character continuity |
| Locations | Library + scene attach | Location continuity |
| Props | Library + scene attach | Prop continuity |
| Worlds | World profiles | World continuity |
| Brand Kit | Brand kits | Brand continuity (slot) |
| Assets | Media / S.5 library | Durable outputs |
| Prompt Presets | Preset storage | Matrix input later |

### Center Workspace

| Content | Role |
|---------|------|
| Current scene / tool surface | Creative work (story, generate, audio, etc.) |
| Tool strip / progressive disclosure | S.2 taxonomy |
| Preview / canvas of current output | Scene images, readiness |

### Right Inspector

| Content | Role |
|---------|------|
| Context-aware controls | Driven by selection (see Context System) |
| Director / camera / entity fields | Never a second Continuity SoT |

### Bottom Bar

| Content | Role |
|---------|------|
| Generation queue / jobs | S.4 GenerationJob visibility |
| Render / Motion handoff | Video path |
| Exports / uploads | IO |

---

## 3. Tablet — adaptive dual-panel

- Collapse rail ↔ inspector into adaptive dual-panel (existing S.2 posture).  
- Continuity entities remain reachable (scenes + libraries).  
- No new IA in S.6C.

## 4. Mobile — single adaptive workspace

- Single panel; progressive navigation.  
- **Robot / assistant permanently hidden** on mobile (existing product rule — preserve).  
- Continuity: scene + attach flows must remain possible (may be sequential screens).

---

## 5. Entity placement (where each belongs)

| Entity | Left Rail | Center | Inspector |
|--------|-----------|--------|-----------|
| Project / Storyboard | Switch / hierarchy | Overview | Storyboard settings |
| Scene | List / order | Active scene work | Scene settings |
| Character | Library + link | Appear in scene context | Character settings when selected |
| Location | Library + link | Scene environment | Location settings |
| Prop | Library + link | Scene objects | Prop settings |
| World | Library | Implicit via links | World settings |
| Brand Kit | Library | Applied context (future) | Brand settings |
| Asset / output | Library | Preview | Asset metadata |
| Job / render | Bottom | Progress | Job detail |

---

## 6. Adaptive Workspace audit (S.6C — architecture only)

| Check | Result |
|-------|--------|
| Canonical deep link exists | **Yes** — `/studio?storyboardId=` |
| Left / center / right structure | **Yes** — shell + rails/inspector |
| Continuity libraries have routes | **Yes** — `/studio/characters|locations|props|worlds` + in-workspace attach |
| Brand Kit / Presets in left rail today | **Partial** — S.5 APIs + assets hub; rail IA above is **target freeze** |
| Bottom jobs bar complete | **Partial** — jobs exist; full bottom bar is target IA |
| Classic still reachable | **Yes** — do not remove (NN-12) |
| Redesign required for S.6C | **No** |

---

## 7. Non-goals

- No new shell redesign  
- No deletion of Classic/Advanced entry points  
- No moving Continuity SoT into UI-only state  
- Robot visibility rules unchanged
