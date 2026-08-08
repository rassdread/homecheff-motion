# Studio S.5 — Canonical Project System

## Purpose

`StudioCreativeProject` is the lightweight highest-level container for a creator’s work.

It does **not** replace Storyboard, Motion (`AnimationProject`), HomeCheff projects, or Editor canvas projects. It optionally **links** them.

## Hierarchy

```
User
 └─ StudioCreativeProject (recent / pinned / favorite / archived / template)
     ├─ StudioLibraryAsset[]
     ├─ StudioAssetCollection[]
     ├─ StudioBrandKit[]
     └─ StudioPromptPreset[]
```

## States

| Status | Meaning |
|--------|---------|
| `active` | Default working project |
| `archived` | Soft-hidden; restorable |
| `template` | Reusable starter (foundation) |

Flags: `pinned`, `favorite`, `lastOpenedAt`.

## Links (nullable)

- `storyboardId`
- `animationProjectId`
- `homeCheffProjectId`
- `editorCanvasProjectId`

Shared / Enterprise ownership is **prepared** (ownerId today) — not implemented.

## APIs

- `GET/POST /api/studio/creative-projects`
- `GET/PATCH/DELETE /api/studio/creative-projects/[projectId]` (DELETE = archive)

## Rules

- Projects remain lightweight.
- Everything durable belongs to a project **or** user library with optional `projectId`.
- No Adaptive Workspace redesign — projects surface inside existing Assets Hub panel.
