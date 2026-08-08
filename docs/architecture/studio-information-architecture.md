# Studio Information Architecture (S.2)

**Status:** CANONICAL  
**Route ownership:** ADR-STUDIO-003 — `/studio?storyboardId=`  
**Adaptive shell:** `docs/architecture/studio-workspace.md`

---

## Top-level destinations

| Destination | Purpose | Status |
|-------------|---------|--------|
| **Home** (`/studio`) | Recent work, continue, new story | LIVE |
| **Projects / Stories** (`/studio/storyboards`) | Storyboard list | LIVE |
| **Workspace** (`/studio?storyboardId=`) | Canonical creative editor | LIVE |
| **Assets** | Characters / locations / props / world (tools + libraries) | LIVE (in-workspace tools) |
| **Templates** | Presets / starters | FUTURE SLOT — do not expose empty nav |
| **History** | Versions / production history | LIVE as workspace tools |
| **Settings** | Account / billing / advanced | LIVE via suite chrome |

Do not create a navigation destination merely because a component exists.

---

## Workspace concepts

Within an open storyboard:

| Concept | Ownership |
|---------|-----------|
| Canvas / Story | Center — Director V2 |
| Scenes | Left rail (desktop) / list pane (mobile) |
| Media / Assets | Center tools: characters, locations, props, world |
| Text / Voice / Music / SFX | Center tool surfaces |
| Subtitles / Translate | Center tools |
| Inspector | Right rail (desktop) / sheet (mobile) |
| AI | Right contextual + on-demand sheet (never permanent robot on mobile) |
| Export / Render | Center tools + header Make video |

---

## Tool taxonomy (progressive disclosure)

Groups (every `StudioToolId` covered once):

1. **Create** — story, visual, text  
2. **Story** — characters, locations, props, world, consistency, continuity  
3. **Audio** — voice, music, sound  
4. **Post** — subtitles, translate, render, export, versions  
5. **Direct** — production, insights, assistants, architecture, preferences, history  

Primary strip shows a curated subset; **More tools** reveals the full set.

---

## Classic editor

| Path | Decision |
|------|----------|
| `/studio/storyboards/[id]/classic` | **KEEP** as advanced-gated legacy parallel |
| Default users | Workspace only |
| Consolidation | Defer deletion until usage proof; S.3+ may retire |

---

## Project context

Header always shows human storyboard **title** (never raw IDs). Eyebrow: Studio · editing context.
