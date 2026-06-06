# Studio V2 Reality Audit

> Date: 2026-06-06 · Commit baseline: `c07be35` (editor-first P0)

## Wat live werkelijk gebeurt

| Route | Gedrag (vóór skeleton sprint) |
|-------|--------------------------------|
| `/` | Rendert `StudioEntryPage` — zelfde als `/studio` |
| `/studio` | **Als `hc-studio-advanced-features=true` in localStorage** → volledige tegelhub (HomeCheff Studio, Motion/Studio cards, 8 tegels). **Anders** → `StudioEditorFirstEntry` → startscherm of redirect naar `/studio/workspace?storyboardId=` |
| `/studio/workspace?storyboardId=` | Enige plek met echte Verhaaleditor (`StudioWorkspaceShell`) |
| Login/signup | Default redirect **`/animate/instant`** (`auth-form.tsx`) |
| Recent project | Alleen als advanced **uit** + ingelogd + localStorage `hc-studio-recent-storyboard-id` → redirect naar **workspace**, niet `/studio` |

**Conclusie:** Editor-first P0 is geïmplementeerd achter **simple mode**, maar de tegelhub blijft de default zodra advanced aan staat — en `/studio` is nog geen editor, alleen een router naar workspace.

## Welke component wordt gerenderd

```
/  ──► studio/page.tsx ──► StudioEntryPage
                              ├─ uiMode === "advanced" ──► TEGELHUB (studio-entry-page.tsx)
                              └─ uiMode === "simple"   ──► StudioEditorFirstEntry
                                    ├─ recent id ──► redirect /studio/workspace?...
                                    └─ else ──► StudioStartPage

/studio/workspace ──► StudioWorkspaceShell (Director V2 + nav sidebar)
```

## Waarom de tegelhub nog zichtbaar is

1. **`hc-studio-advanced-features=true`** in localStorage → `useStudioProductionUiMode()` returns `"advanced"` → `StudioEntryPage` renders hub (regel 70–72 `studio-entry-page.tsx`).
2. **`NEXT_PUBLIC_PRODUCTION_MODE=false`** → advanced mode **altijd** aan (`studio-advanced-features.ts` regel 39–41).
3. Advanced toggle op startscherm/workspace **schakelt hub terug** op volgende `/studio` bezoek.
4. Hub toont in simple+advanced filter nog steeds: Verhaaleditor, Personages, Locaties, Props, Storyboards — **niet** alleen worlds/assets/providers.

## Waarom login soms naar /animate/instant gaat

`src/components/auth/auth-form.tsx`:

```typescript
const DEFAULT_POST_AUTH_PATH = "/animate/instant";
```

Geen `?next=` parameter → altijd Motion wizard na login.

## Welke Studio V2 onderdelen al bestaan

| Onderdeel | Status | Zichtbaar voor user? |
|-----------|--------|----------------------|
| `StudioWorkspaceShell` + Director V2 | ✅ Live | Alleen via workspace URL |
| `StudioEditorFirstEntry` + recent redirect | ✅ Live | Simple mode only |
| `StudioStartPage` + inline create | ✅ Live | Simple mode, geen project |
| `StudioNewStoryButton` | ✅ Live | Start + bibliotheek |
| `studio-recent-storyboard` localStorage | ✅ Live | Redirect naar workspace |
| Classic editor panels (voice/music/sound) | ✅ Gebouwd | Alleen `/storyboards/[id]/classic` |
| Asset libraries CRUD | ✅ Gebouwd | Losse `/studio/characters` etc. |
| Unified asset registry | ✅ Gebouwd | `/studio/assets` (advanced tegel) |
| Provider registry UI | ✅ Gebouwd | `/studio/providers` (advanced tegel) |
| Motion handoff | ✅ Live | "Maak video" knop → import URL |
| Tool strip (voice/text/export) | ❌ Niet gebouwd | — |
| `/studio` = unified shell | ❌ Niet gebouwd | — |
| Video import / edit existing | ❌ Placeholder only | Disabled knop |

## Welke routes nog naar oude flow wijzen

| Route | Probleem |
|-------|----------|
| `/` | Entry hub, niet editor |
| `/studio` | Entry hub (advanced) of start (simple) |
| `/studio/workspace` (zonder id) | "Kies storyboard" → `/studio/storyboards` |
| `/studio/workspace` | Parallelle editor-URL i.p.v. `/studio?storyboardId=` |
| `motion-studio-onboarding.tsx` | Links naar `/storyboards/new`, `/animate/instant` |
| Post-auth | `/animate/instant` |

## Welke onderdelen dubbel zijn

| Dubbel | Details |
|--------|---------|
| Entry surfaces | `StudioStartPage` vs `StudioProductionSplash` (unused) vs tegelhub |
| Editor URLs | `/studio/workspace` vs gewenst `/studio?storyboardId=` |
| Asset UI | Left nav tabs in workspace **en** losse CRUD pages **en** `/studio/assets` |
| Classic vs Workspace | Twee editors; classic heeft audio panels workspace mist |
| Onboarding | `MotionStudioOnboarding` in workspace wijst naar oude paden |

## Welke onderdelen verwijderd kunnen worden

| Component | Advies |
|-----------|--------|
| `StudioProductionSplash` | **Verwijderen** — nergens gebruikt |
| Hub op `/studio` | **Verplaatsen** naar `/studio/advanced` |
| `StudioEditorFirstEntry` | **Mergen** in root shell resolver |

Niet verwijderen (nog fallback): classic editor, CRUD pages, provider registry (admin).

## Welke onderdelen alleen verborgen zijn

- Provider registry, worlds, assets tegels — `ADVANCED_ONLY_HREFS` + advanced toggle
- Classic editor, production center — `advancedFeatures` checkbox in workspace header
- Execution plan, provider panels — classic editor only
