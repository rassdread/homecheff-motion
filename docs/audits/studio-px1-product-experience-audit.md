# STUDIO × HOMECHEFF PRODUCT EXPERIENCE — PX.1 FULL AUDIT

Status: **COMPLETE** (read-only). Canonical input for PX.2.  
Scope: Production Studio (`studio.homecheff.eu` / `homecheff-studio-p0-cookie`) plus Growth Ontdek/SSO contracts.  
Not done in PX.1: implementation, redesign, Production changes.

## Verdict

Studio is technically powerful. The front door is still **tool-architecture first** (Editor / Studio / Motion / Publish). A normal HomeCheff creator hits jargon, competing CTAs, and configure-before-result. HomeCheff continuity today is **identity only**, not content context.

## Current product map

~118 App Router pages. Surfaces: Universe home, Studio landing/dashboard, Experience packs, story brief wizard, Adaptive Workspace + Director V2, Classic editor (advanced-gated), Editor, Motion/Instant, Publish, Videos, Library, entity CRUDs, onboarding, credits, Ontdek.

No `/director`, `/memory`, or Studio affiliate entry routes.

## Current user journey

**Direct Studio:** `/` communicates brand and capabilities within ~5 seconds, but **not** one obvious next action (~10+ entry points). Home “Start nieuw project” → `/studio/experience`. Studio landing “Start met maken” → `/studio/storyboards/new`. Fastest useful visual: Instant Motion. First-success celebration is Motion-centric.

**HomeCheff → Studio:** Ontdek ecosystem silent SSO to `/`. No listing import. No return/attach to HomeCheff.

**Project creation:** 7-step brief (`idea → brief → director → planning → build → route → preview`) before workspace. First landing is often an empty story workspace, not a playable video.

## Top 10 UX complexity problems

1. Too many start doors  
2. Tools before outcomes  
3. Conflicting “new project” meanings  
4. Configure-before-result story path  
5. NL UI + EN product jargon  
6. Workspace density  
7. No HomeCheff content bridge  
8. No finish → HomeCheff  
9. Duplicate AI brains (Copilot vs Director vs specialized directors)  
10. Naming collisions (Motion Studio / Motion / Animate / Animatie; storyboard / videoverhaal)

## Terminology (PX.1 → PX.2 direction)

| Current | Normal UI |
|---------|-----------|
| Universe | Home / Start |
| Motion Studio (dashboard) | Jouw studio |
| Motion / Animate / Instant | Animatie |
| Storyboard / Videoverhaal | Verhaal |
| Experience | Wat wil je maken? |
| Orchestrator | Video maken |
| Director / AI-regisseur | Suggesties (Director = advanced) |
| Copilot / Assistent | Hulp |
| Props | Objecten |
| World | Stijlwereld |
| Asset | Bestand / Onderdeel |
| Memory | Kenmerken |
| Consistency | Human NL (not “Doorlopendheid”) |
| Publish | Video afronden |
| Handoff | Doorgaan naar… |
| FrameFlow | Internal only |

## Feature classification (hypothesis)

- **Core simple:** stories, Editor basics, Instant, Publish finish, Library, credits, onboarding, SSO  
- **Contextual:** Experience packs, orchestrator, audio when finishing, subtitles  
- **Advanced:** Director expert, worlds, memory/consistency, classic/movie-builder, providers, character pipelines  
- **Background:** jobs, admin, SSO middleware, shell-first hydrate  
- **Legacy/duplicate:** `/studio/my-studio`, `/studio/advanced`, library aliases, fuse/transform redirects, Motion vs Animate families  

## HomeCheff integration

**Exists:** Ontdek SSO, `centralUserId`, brand mark/colors, “HomeCheff Studio” name.  
**Missing:** listing/product deep links, import, attach result, returnUrl.  
**Do not invent marketplace APIs in PX.2.**

## Simple vs advanced

Default: intent → content → first preview → small edits → finish.  
Advanced remains reachable: workspace, Director expert, audio directors, worlds, classic editor, Copilot routing.

## Target simple journey (not implemented in PX.1)

Home asks **Wat wil je maken?** → HomeCheff item / social from photos / idea / continue → first preview → simple edits → finish. Advanced editor always available.

## Product laws

1. One obvious next action  
2. Intent before tools  
3. Never ask twice for known HomeCheff information  
4. Default → Meer opties → Geavanceerd  
5. First useful result before deep configuration  
6. AI translates intent quietly  
7. Simplification does not delete advanced capabilities  
8. Tell the user what happens next  
9. Context follows the user between HomeCheff and Studio  
10. Finishing has an obvious destination  
11. One meaning per word  
12. The same start verb must not lead to unrelated concepts  

## Recommended next phase

**PX.2 — Information architecture & terminology** (copy/nav/flags only; no route migration, no PX.3 home funnel).
