# Studio S.5 — Prompt Presets Foundation

## Scope

**Storage architecture only.**

Do **not** implement Prompt Matrix optimization or Creative Director (reserved for **Studio S.6**).

## Model

`StudioPromptPreset`

| Field | Notes |
|-------|--------|
| `scope` | `user \| project \| brand \| default \| system` |
| `presetJson` | Safe prompt body / structured fields |
| `tagsJson` | Discoverability |
| `projectId` | Optional project preset |
| `favorite` | Universal favorites target |

## API

- `GET/POST /api/studio/library/prompt-presets`

## S.6 compatibility

Presets are selectable storage units. S.6 may read/write presets and attach AI-generated presets without schema rewrite. No automatic prompt optimization in S.5.
