# HomeCheff Studio — architecture (V1)

Foundation release: navigation, landing page, placeholder routes, and TypeScript models only. Motion workflow is unchanged.

## Product split

| Area | Role | Route |
|------|------|-------|
| **Motion** | Fast AI video generation (current instant/premium flow) | `/animate/instant` |
| **Studio** | Future movie-making environment — reusable assets | `/studio` |
| **My Videos** | Gallery of rendered projects | `/videos` |

## Planned integration flow

```
Studio
  ↓
Characters · Locations · Props · Storyboards
  ↓
Scene Composer          ← not in V1
  ↓
Motion Render Engine
  ↓
Vidu
  ↓
Video
```

## V1 deliverables

- Top nav: Motion | Studio | My Videos
- `/studio` landing with four alpha feature cards + vision roadmap
- Placeholder routes for locations, props, storyboards
- Types: `src/types/studio.ts` (non-character pillars)

## V2 deliverables (Characters)

- Prisma `StudioCharacter` + migration
- CRUD API: `/api/studio/characters`
- UI: library, create, detail, edit (`/studio/characters/*`)
- `CharacterSnapshot` for future Motion integration (no Vidu wiring)

## V3 deliverables (Locations)

- Prisma `StudioLocation` + migration `20260605120000_studio_location`
- CRUD API: `/api/studio/locations`
- UI: library, create, detail, edit (`/studio/locations/*`)
- `LocationSnapshot` for future Motion integration (no Vidu wiring)

## V4 deliverables (Props)

- Prisma `StudioProp` + migration `20260606120000_studio_prop`
- CRUD API: `/api/studio/props`
- UI: library, create, detail, edit (`/studio/props/*`)
- `PropSnapshot` + shared Studio helpers (blob, slug, search)

## Studio foundation (V4)

Characters · Locations · Props

## V5 deliverables (Storyboards & Scene Composer)

- Prisma `StudioStoryboard`, `StudioScene`, junction tables + migration `20260607120000_studio_storyboard`
- CRUD API: `/api/studio/storyboards` + nested scenes/reorder/duplicate
- UI: library, create, editor (`/studio/storyboards/*`) with drag-and-drop scene order
- `StoryboardSnapshot` / `SceneSnapshot` for future Motion (no Vidu wiring)

## Studio foundation (V5)

Characters · Locations · Props · Storyboards — ready for Motion handoff (V6+).

## V6 deliverables (Motion handoff)

- `MotionHandoffPayload` + `createMotionHandoffPayload()`
- API `GET /api/studio/storyboards/[id]/handoff`
- Studio **Open in Motion** → `/animate/instant/import?storyboardId=…`
- Wizard prefill (scene slots + `studioContext` metadata)
- Collapsible **Studio context** panel in Motion (read-only)

## Not in V6

- Vidu prompt wiring
- Automatic image generation from Studio assets

## V7 deliverables (Prompt Builder)

- `buildScenePrompt()` and section builders (`src/lib/studio-prompt-builder.ts`)
- Style profiles per storyboard (`promptStyleProfile`, default commercial)
- Scene Composer **Prompt Preview** tab
- `MotionHandoffPayload` v2 with `generatedPrompt` + lightweight `promptVersion` metadata
- Future pipeline doc: `docs/studio-prompt-ai-future.md`

## Not in V7

- Image generation from Studio assets
- Vidu prompt injection from generated prompts
- Prisma table for prompt version history

## Before Studio V8

- Image Generator step between Prompt Builder and Motion
- Optional reference images from character/location/prop URLs in Vidu multi-image prompts
- Per-scene prompt overrides in UI
- Persist prompt versions on export / render-version snapshots

See also: `src/lib/studio-integration-architecture.ts`, `docs/studio-prompt-ai-future.md`.
