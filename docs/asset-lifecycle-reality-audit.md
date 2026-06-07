# Asset Lifecycle Reality Audit

**Date:** 2026-06-06  
**Scope:** Read-only audit before Asset Lifecycle Completion sprint.

---

## Wat al compleet was

| Flow | Status |
|------|--------|
| **Use Existing** | Registry → Director proposal scene refs → apply links scenes |
| **Skip** | Filtered from planner, generation, brief |
| **Decision capture** | Production Brief UI + localStorage registry |
| **Prefill (character only)** | Session prefill → `/studio/characters/new` |

---

## Waar lifecycle doodliep

| Gap | Impact |
|-----|--------|
| **Build New → save** | Decision bleef `build_new`; geen `existingId` |
| **Standalone new pages** | Geen registry update na create |
| **Workspace create sheet** | Scene link wel; registry niet |
| **Location/prop/world prefill** | Niet wired op new pages |
| **Creation Assistant** | Laadde registry niet; `build_new` bleef als missing |
| **Production Plan panel** | Laadde registry niet |
| **World brief UI** | Geen decision row (types wel ondersteund) |

---

## Registry states die bleven hangen

- `build_new` zonder `existingId` — permanent "in aanbouw"
- Geen onderscheid tussen "gekozen bestaand" en "net gebouwd"
- `filterAssetEvolutionByDecisions` — gedefinieerd maar niet aangesloten

---

## UX-frictie

1. Gebruiker bouwt asset → keert terug naar workspace → Brief/Assistant tonen nog "missing"
2. AI Director proposal mist nieuwe asset tot handmatige refresh/hergeneratie
3. Creation Assistant toont dubbele taken (missing + build_new intent)

---

## Central hook point

`studio-asset-lifecycle-resolver.ts` + `completeAssetLifecycleAfterCreate()` client helper, aangeroepen na elke asset create met `storyboardId`.
