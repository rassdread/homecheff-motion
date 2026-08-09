# S.6G — Workspace Integration Audit

**Rule:** Do not redesign Adaptive Workspace. Experience Packs must integrate into existing Quick / Professional / Director modes and the existing Creative Director tool.

---

## Current integration

| Surface | Placement | Status |
|---------|-----------|--------|
| Desktop | Right tools — `creativeDirector` (Direct group) | LIVE thin panel |
| Tablet | Contextual tool panel | Same tool |
| Mobile | On-demand tool sheet | Same tool |
| Classic / Fusion / Movie Builder / Production | Unchanged routes | Preserved |
| Floating robot / separate app | Forbidden | Absent ✓ |

Sources: `studio-tool-id.ts`, `StudioWorkspaceCreativeDirectorPanel`, S.6F docs.

---

## Mode integration (architectural)

| Mode | Pack behavior expected | Today |
|------|------------------------|-------|
| QUICK | Pack questions → generate | Registry + mode policy; consumer Instant/Maak not pack-driven |
| PROFESSIONAL | Brand / audience / platform | Mode policy YES; surfaces fragmented |
| DIRECTOR | Full entities + planners | Workspace tools YES; pack orchestration optional |

Mode policy: `mode-policy.ts` — filters recommended planners; does **not** delete product surfaces.

---

## Pack → workspace entry map

| Pack family | Natural workspace entry |
|-------------|-------------------------|
| PEOPLE / BUSINESS Quick | Creative Director tool + Instant (after wiring) |
| SOCIAL | Creative Director + Studio start intents + Motion |
| CREATIVE Storyboard/Film | Scenes + Movie Builder + Production (Director) |
| IDENTITY | Character Studio prepare flows + Continuity tools |

---

## What S.6G must not do

- Redesign shell / tool strip / three-pane layout
- Add floating coach avatar
- Remove Classic / Fusion / Movie Builder / Production Center
- Move billing / credits into Director panel

## What S.6G implementation may do (thin)

- Drive Creative Director panel from pack ID when opened from Instant/Studio/CS
- Show pack `quickQuestions` + Coach chips in existing panel sections
- Deep-link `?experience=` / existing intent/preset params into resolver (no new app)

**Workspace integration score: 3.5 / 5** (placement correct; pack-driven flows incomplete)
