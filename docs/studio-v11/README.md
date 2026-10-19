# HomeCheff Studio V11 — filmmaking blueprint

**Audit:** HOMECHEFF_STUDIO_COMPLETE_CAPABILITY_AUDIT_AND_FILM_WORKSPACE_BLUEPRINT_V11  
**Date:** 2026-10-19  
**Code baseline:** `feature/passion-character-masters-production` at `78396bc4`  
**Production:** https://studio.homecheff.eu  
**Mode:** read-only. No production writes, migrations, deploys, or paid provider calls.

This folder is the implementation brief for the next phase. It does not build the workspace.

## Read this first

1. [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md) — what actually exists.
2. [DATA_MODEL_AUDIT.md](DATA_MODEL_AUDIT.md) — how projects, scenes, and media are stored.
3. [UX_BLUEPRINT.md](UX_BLUEPRINT.md) and [HOMECHEFF_BRAND_AND_UI_DESIGN_SYSTEM.md](HOMECHEFF_BRAND_AND_UI_DESIGN_SYSTEM.md) — how the workspace should look.
4. [AI_DIRECTOR_ARCHITECTURE.md](AI_DIRECTOR_ARCHITECTURE.md) and [HC_COST_ARCHITECTURE.md](HC_COST_ARCHITECTURE.md) — how an AI director may execute the same services as the UI.
5. [MADE_WITH_PASSION_WORKFLOW.md](MADE_WITH_PASSION_WORKFLOW.md) — the 55-second commercial as the acceptance scenario.
6. [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) — what to build first.

## Naming collision

The repository already contains `src/lib/studio-v11-director-wizard.ts`. That module is a **briefing wizard**. It asks questions and fills a production brief. It does not call image, video, or voice providers. This audit uses “V11” for the blueprint. The existing wizard is called the **director briefing wizard** below.

## Hard constraints carried forward

- Baker, Potter, and Gardener master images stay. Do not regenerate them.
- MADE WITH PASSION (`cmvcbmxdp00032jryohiw8a84`) stays the film project.
- Manual mode and AI director mode must call the same domain services.
- HC is reserved only after an explicit quote and approval.
- Do not add a second library, a second character editor, or a second video generator.
