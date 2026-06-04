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

Characters · Locations · Props — ready for V5 Scene Composer.

## Not in V4

- Scene Composer
- Vidu / Motion prompt wiring
- Storyboards persistence

## Before Studio V5

- Storyboards library + Scene Composer data model
- Auth / ownership rules for Studio assets
- Upload pipeline for reference images
- API routes and list/detail UI per pillar
- Design Scene Composer data model and its handoff to Motion scene slots

See also: `src/lib/studio-integration-architecture.ts`.
