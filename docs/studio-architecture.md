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
- Service layer: `src/server/studio/studio-character-service.ts`
- `CharacterSnapshot` for future Motion integration (no Vidu wiring)

## Not in V2

- Scene Composer
- Vidu / Motion prompt wiring
- Locations, props, storyboards persistence

## Before Studio V3

- Prisma models for locations, props, storyboards
- Auth / ownership rules for Studio assets
- Upload pipeline for reference images
- API routes and list/detail UI per pillar
- Design Scene Composer data model and its handoff to Motion scene slots

See also: `src/lib/studio-integration-architecture.ts`.
