# Studio Skeleton Completion Report

> Date: 2026-06-06 · Follows [Studio V2 Reality Audit](./studio-v2-reality-audit.md)

## Wat al bestond

- `StudioWorkspaceShell` + Director V2 (volledige scene editor)
- `StudioEditorFirstEntry` + recent-project redirect (naar workspace URL)
- `StudioStartPage` + `StudioNewStoryButton` (inline create)
- Asset lists, inspector panel, mobile insights sheet
- Classic editor, CRUD libraries, provider registry (losse routes)
- Audio director panels (alleen classic editor)

## Wat ontbrak

- `/studio` als **unified shell** (was entry hub of startscherm)
- Canonical URL `/studio?storyboardId=` (was `/studio/workspace?...`)
- Login redirect naar Studio (was `/animate/instant`)
- Tool strip met placeholders voor Stem/Muziek/Tekst/Export
- Scènes-only linker sidebar (assets zaten dubbel in left nav)
- Advanced hub gescheiden van primary flow
- Empty state **binnen** shell chrome (niet los startscherm)

## Wat is aangepast

| Wijziging | Effect |
|-----------|--------|
| `/` en `/studio` → `StudioRootPage` | Eén entry: editor shell, empty view, of project |
| `studioWorkspaceHref()` → `/studio?storyboardId=` | Canonical editor URL |
| `/studio/workspace` → redirect naar `/studio?...` | Backward compatible |
| `/studio/advanced` | Legacy tegelhub (developer tools only) |
| `DEFAULT_POST_AUTH_PATH` → `/studio` | Login landt in Studio |
| `StudioShellHeader` | Studio · Mijn videoverhalen · Nieuw verhaal · Maak video |
| `StudioToolStrip` + placeholders | 12 tools; 7 placeholders voor P1 |
| Workspace: scenes links, tools in strip | Geen dubbele left nav meer |
| Advanced toggle **niet meer** hub op `/studio` | Hub alleen via `/studio/advanced` |

## Gewijzigde / nieuwe bestanden

**Nieuw:** `studio-root-page.tsx`, `studio-shell-empty-view.tsx`, `studio-shell-header.tsx`, `studio-tool-strip.tsx`, `studio-tool-placeholder-panel.tsx`, `studio-advanced-hub-page.tsx`, `studio-tool-id.ts`, `app/studio/advanced/page.tsx`, audit + completion docs

**Gewijzigd:** `app/studio/page.tsx`, `app/page.tsx`, `app/studio/workspace/page.tsx`, `studio-workspace-shell.tsx`, `studio-workspace-href.ts`, `auth-form.tsx`, `en.ts`, `nl.ts`, `e2e/studio-smoke.spec.ts`

## Nieuwe Studio flow

```
/studio
  ├─ ?storyboardId=… ──► StudioWorkspaceShell (editor + tool strip)
  ├─ ingelogd + recent ──► redirect ?storyboardId=recent
  └─ geen project ──► StudioShellEmptyView (zelfde chrome, center CTAs)

Login ──► /studio
/studio/workspace?... ──► redirect /studio?...
/studio/advanced ──► legacy hub (optioneel)
```

## Wat nog P1 integratie is

- Stem/Muziek/Geluid panels (classic editor panels embedden)
- Tekst / ondertitels / vertalen / exporteren (Motion panels embedden)
- Asset picker modal (choose existing vs new) i.p.v. links naar CRUD
- Foto's naar video binnen shell (nu nog `/animate/instant`)
- Bi-directional render status in shell

## Wat nog P2 is

- Video upload / edit existing
- Voice cloning / recording
- Schema: unified project type, timeline tracks
- AI auto-fill scene
