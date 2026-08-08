# Studio Editor UX (S.3)

**Status:** CANONICAL  
**Depends on:** Adaptive Workspace shell (S.2), Creative Workflow model (S.3)

---

## Surfaces

| Surface | Role |
|---------|------|
| Header | Project title, workflow stage chip, save state, Studio home, New story, Make video |
| Left rail | Scene list, add, reorder |
| Center | Active tool panel + scene preview chrome |
| Right inspector | Selection-scoped controls |
| Tool strip / More | Progressive Create · Story · Audio · Post · Direct |
| AI | On-demand / contextual — never permanent robot on mobile |

---

## Primary vs secondary actions

Each context should have **one** dominant CTA:

| Context | Primary |
|---------|---------|
| Empty project | Create first scene |
| Scene image | Generate / Regenerate (with credit hint) |
| Voice | Generate voice (with credit hint) |
| Ready to output | Make video / Render |
| After render | Export / Download |

Avoid five equally weighted buttons.

---

## Save feedback

Header `data-testid="studio-save-state"`:

- `saving` — scene PATCH in flight  
- `unsaved` — local draft dirty  
- `saved` — clean after load/save  

Autosave of drafts is not universal; explicit scene save remains where panels require it.

---

## Generation lifecycle (UX)

Map UI busy/status onto:

`READY → QUEUED → GENERATING → PROCESSING → SUCCESS | FAILED | CANCELLED`

Use backend status strings when present (e.g. scene image `status`). Show Retry / modify prompt paths without forcing full scene rebuild.

Non-blocking: other scenes/tools remain editable while a generation runs **when** the panel is local-busy only (no global workspace freeze). Backend concurrency limits still apply.

---

## Preview vs Edit

- **Edit:** tool chrome + inspector + scene list + tool strip  
- **Preview mode:** header stage chip Preview; hide tool strip / inspector / tool panels; enlarge center scene composition; **Back to edit**  
- Stage inference also maps Insights / creative review tools to preview when not in explicit preview mode  

Do not invent a second playback engine.

---

## Mobile / tablet

S.2 posture rules stand. Creative workflow must work without hover-only controls:

- open project → select scene → visual / text / voice / subtitles → preview → render path  
- Robot permanently hidden on mobile  
- Landscape: canvas + compact tools; avoid extra bottom chrome when side rail is available

---

## Accessibility

- Min 44px hit targets on primary scene/tool controls  
- Reorder buttons labeled (`moveSceneUp` / `moveSceneDown`)  
- Save and stage state announced via visible text (not color alone)
