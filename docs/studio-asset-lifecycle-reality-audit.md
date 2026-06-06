# Asset Lifecycle Reality Audit

Studio V2 — read-only audit of how library assets are created, linked, reused, and removed.  
**Geen code gewijzigd.** Datum: juni 2026.

---

## Character lifecycle

| Fase | Waar | Gedrag |
|------|------|--------|
| **Aanmaken** | `createStudioCharacter` → `POST /api/studio/characters` | UI: `/studio/characters/new`, `studio-character-form.tsx`, workspace `studio-workspace-asset-create-sheet.tsx` |
| **Bewerken** | `updateStudioCharacter` → `PATCH /api/studio/characters/[id]` | Detail/edit pages, voice panels, performance fields |
| **Koppelen** | Join `StudioSceneCharacter` via `syncSceneRelations` in `studio-storyboard-service.ts` | Workspace scene assets panel, scene composer, scene PATCH |
| **Hergebruik** | Director (`scoreCharacterMatch`), Memory (`detectRecurringCharacter`), Continuity panel, prompts (`studio-prompt-character-builder.ts`), Motion handoff | Matching op tokens + fuzzy naam; memory boost op prior usage |
| **Verwijderen** | `deleteStudioCharacter` → `DELETE /api/studio/characters/[id]` | Library + detail confirm dialog |
| **Cascade** | `StudioSceneCharacter` rows verwijderd; `StudioCharacterVoiceHistory` verwijderd | Scènes blijven bestaan, personage-link weg |
| **Blob cleanup** | Alleen `referenceImageUrl` | Mouth-cycle URLs, voice-preview blobs **niet** opgeruimd |

**Uniekheid:** `@@unique([ownerId, slug])` — **geen** unieke display name. Twee “Chef Marco” → `chef-marco`, `chef-marco-2`.

**Rename:** Naam wijzigen → **nieuwe slug** via `resolveUniqueSlug` (oude slug komt vrij). ID blijft stabiel; slug-URLs kunnen verouderen.

**Asset health:** 🟡 **Waarschuwing** — sterke ID-based linking, maar naam-duplicaten en incomplete blob cleanup.

---

## Location lifecycle

| Fase | Waar | Gedrag |
|------|------|--------|
| **Aanmaken** | `createStudioLocation` → `POST /api/studio/locations` | `/studio/locations/new`, forms, workspace sheet |
| **Bewerken** | `updateStudioLocation` → `PATCH /api/studio/locations/[id]` | Detail/edit |
| **Koppelen** | Direct FK `StudioScene.locationId` (1 locatie per scène) | Storyboard service, scene PATCH |
| **Hergebruik** | Director, Memory, continuity, location prompt builder | Geen M2M —zelfde locatie-ID hergebruikt over scènes |
| **Verwijderen** | `deleteStudioLocation` → `DELETE /api/studio/locations/[id]` | Library confirm |
| **Cascade** | `locationId → SetNull` op scènes | Scène blijft, locatie leeg |
| **Blob cleanup** | Reference image via `deleteStudioReferenceBlob` | — |

**Uniekheid:** Slug per owner, name niet uniek.

**Asset health:** 🟢 **Gezond** voor linking (simpele FK). 🟡 **Waarschuwing** op schaal (geen usage guard bij delete).

---

## Prop lifecycle

| Fase | Waar | Gedrag |
|------|------|--------|
| **Aanmaken** | `createStudioProp` → `POST /api/studio/props` | `/studio/props/new`, forms |
| **Bewerken** | `updateStudioProp` → `PATCH /api/studio/props/[id]` | Detail/edit |
| **Koppelen** | Join `StudioSceneProp` | syncSceneRelations |
| **Hergebruik** | Director `scorePropMatch`; memory stats in project-memory | **Geen** `detectRecurringProp` in continuity sweep |
| **Verwijderen** | `deleteStudioProp` → `DELETE /api/studio/props/[id]` | Library confirm |
| **Cascade** | Join rows verwijderd | — |

**Asset health:** 🟡 **Waarschuwing** — zelfde slug/naam-risico als characters; minder memory/continuity coverage dan characters/locations.

---

## World lifecycle

| Fase | Waar | Gedrag |
|------|------|--------|
| **Aanmaken** | `createStudioWorldProfile` → `POST /api/studio/worlds` | Worlds library/forms |
| **Bewerken** | `updateStudioWorldProfile` → `PATCH /api/studio/worlds/[id]` | Detail/edit |
| **Koppelen** | **Indirect** — `worldProfileId` op character/location/prop | Geen scene FK |
| **Hergebruik** | `detectRecurringWorld`, continuity world section, director prompts via linked assets | Memory worldMap via char/loc/prop usage |
| **Verwijderen** | `deleteStudioWorldProfile` → `DELETE /api/studio/worlds/[id]` | Library confirm |
| **Cascade** | `worldProfileId → SetNull` op alle gekoppelde assets | Geen confirmatie |

**Asset health:** 🟡 **Waarschuwing** — indirecte koppeling maakt impact bij delete/ rename moeilijk zichtbaar voor gebruiker.

---

## Voice lifecycle

Twee lagen:

### A. Character voice identity (planning)

| Fase | Waar |
|------|------|
| **Aanmaken** | Velden op character create (`voiceProfile`, `voiceEnabled`, locks) |
| **Bewerken** | Character PATCH; history in `StudioCharacterVoiceHistory` |
| **Koppelen** | Via character → scene join |
| **Hergebruik** | Project memory aggregeert op `voiceProfile`; recurring detection boost |
| **Verwijderen** | Cascade met character delete |

### B. Generated storyboard narration (`StudioStoryboardVoice`)

| Fase | Waar |
|------|------|
| **Aanmaken** | `generateStoryboardVoice` → `POST /api/studio/storyboards/[id]/voice` |
| **Bewerken** | Storyboard voice fields; regenerate = upsert `(storyboardId, language)` |
| **Verwijderen** | **Geen dedicated DELETE** — alleen storyboard cascade |
| **Blob** | Overwrite on regenerate; geen orphan sweep |

**Asset health:** 🟡 **Waarschuwing** — geen voice asset library; profile strings niet uniek per owner.

---

## Scene image lifecycle

| Fase | Waar | Gedrag |
|------|------|--------|
| **Aanmaken** | `generateStudioSceneImage`, bulk generate, regenerate, improve | Blob: `studio-scene-image-blob.ts` |
| **Bewerken** | Status/scores (consistency, vision); select preferred | `setPreferredStudioSceneImage` |
| **Koppelen** | FK `sceneId`; `StudioScene.selectedSceneImageId` | — |
| **Hergebruik** | Motion handoff, improvement auto-select | Meerdere generations per scène toegestaan (`generationVersion`) |
| **Verwijderen** | `deleteStudioSceneImage` — blobs main+thumb | Scene/storyboard delete cascade DB rows **zonder** blob sweep |
| **Regeneratie chain** | `regeneratedFromImageId` → SetNull on parent delete | Oudere versies blijven in DB tot handmatig/scene delete |

**Asset health:** 🔴 **Risico op schaal** — onbeperkte generations × scènes × storyboards → blob volume; cascade delete laat storage achter.

---

## Reference image lifecycle (embedded)

Geen apart model — velden op character/location/prop:

- `referenceImageUrl`, `referenceStorageKey`
- Character: extra `mouth*AssetUrl`, `primaryReferenceImageId` (opaque string, **geen FK**)

| Fase | Waar |
|------|------|
| **Upload** | `POST /api/uploads/images` via instant-image-upload-client |
| **Replace** | Asset PATCH → oude reference blob deleted |
| **Delete** | Met parent asset (partial voor character) |

**Asset health:** 🟡 **Waarschuwing** — geen gedeelde reference catalog; duplicaat-uploads mogelijk.

---

## Generated images (samenvatting)

“Generated images” in Studio = **`StudioSceneImage`** rows + Vercel Blob URLs. Geen aparte generated-image registry.

---

## Duplicate risks

| Risico | Ernst | Mechanisme |
|--------|-------|------------|
| Zelfde **display name**, verschillende slug | Hoog | `chef-marco`, `chef-marco-2` both “Chef Marco” |
| Director **proposed new** + handmatig create | Medium | Apply skipt new assets (`skippedNewAssets`); user maakt alsnog dubbele naam |
| **Recurring detection** fuzzy match | Medium | `namesMatch` kan verkeerde asset kiezen bij gelijkaardige namen |
| **Reference image** duplicate upload | Laag | Geen dedup op blob hash |
| **Scene images** | Geen duplicaat-probleem | Meerdere generations **bedoeld** |
| **Voice profile** duplicate strings | Medium | Zelfde preset ID op meerdere characters — OK by design |

Voorbeeld uit audit-scope:

```
Chef Marco       (slug: chef-marco)
Chef Marco Copy  (slug: chef-marco-copy)   ← toegestaan
Chef Marco V2    (slug: chef-marco-v2)     ← toegestaan
```

Continuity/Memory **waarschuwt**, blokkeert **niet**.

---

## Orphan risks

| Orphan type | Oorzaak | Opgeruimd? |
|-------------|---------|------------|
| Scene image blobs | Scene/storyboard delete cascade | **Nee** (DB only) |
| Storyboard voice audio blobs | Storyboard delete | **Nee** (DB cascade) |
| Character mouth assets | Character delete/update | **Nee** |
| Voice preview blobs | Ephemeral preview API | **Nee** |
| Freed slugs | Rename → old slug vacant | N/A (hergebruik door nieuwe asset mogelijk) |
| DB assets zonder scene link | Never linked after create | **Blijven in library** (geen auto-archive) |

Project Memory telt usage — assets met `storyboardCount: 0` zijn **logisch orphan** maar blijven zichtbaar in library.

---

## Delete risks

| Actie | Wat breekt | Waarschuwing UI? |
|-------|------------|------------------|
| Delete character | Scene joins weg; consistency/director lose link | Alleen generic confirm |
| Delete location | Scenes `locationId = null` | Generic confirm |
| Delete prop | Scene joins weg | Generic confirm |
| Delete world | All char/loc/prop `worldProfileId = null` | Generic confirm |
| Delete scene image | Clears selection if needed | In scene panel |
| Delete storyboard | Cascades scenes, images, voices, jobs | Storyboard confirm |

**Geen** “used in N storyboards” guard op library delete pages.

**Continuity impact na delete:** Memory stats dalen bij volgende fetch; bestaande storyboard snapshots/handoff JSON kunnen **stale names/IDs** bevatten tot refresh.

---

## UX risks

| Probleem | Huidige staat |
|----------|---------------|
| **Wat is actief?** | Alleen in workspace continuity tab (`inCurrentProject`) |
| **Wat is oud?** | Geen archive/deprecated flag (behalve `isSystem*` ongebruikt in delete guard) |
| **Wat wordt gebruikt?** | Standalone libraries: **geen** usage counts; continuity tab + memory API wel |
| **Veilig verwijderen?** | Geen “in use” indicator op delete |
| **1000+ assets** | `findMany` zonder pagination; client-side search; workspace laadt **alle** libraries per sessie |
| **Zoeken** | `filterStudioAssetsBySearch` — substring op name/description only |

---

## Wat al goed is

1. **Stable IDs** voor alle library assets — scene links via FK/join, niet via naam.
2. **Slug uniqueness per owner** — voorkomt URL collisions, niet display-name collisions.
3. **Director apply never auto-creates** library rows — bewuste controle.
4. **Project Memory** — cross-storyboard usage zonder schema migratie.
5. **Recurring detection + continuity score** — richting hergebruik zonder hard blocks.
6. **Scene image delete** — proper blob cleanup bij individuele delete.
7. **Reference replace** — oude blob deleted on PATCH.
8. **Cascade rules** — voorspelbaar Prisma gedrag (SetNull vs Cascade).

---

## Wat gevaarlijk wordt op schaal (1000+ assets)

| Area | Risico |
|------|--------|
| **List APIs** | Full-table `findMany` voor characters/locations/props/worlds |
| **Workspace boot** | 4× full library + storyboard detail + project memory queries |
| **Library UI** | Render 1000 cards; client filter only |
| **Memory service** | Full scan scene-character/location links per owner (indexed maar O(links)) |
| **Scene images** | Unbounded generations → storage cost |
| **Name duplicates** | Director/memory ambiguity groeit met library size |
| **Orphan blobs** | Storage drift zonder sweeper |
| **Delete zonder guard** | Accidental unlink op actieve productie-storyboards |

**Conclusie schaal:** Studio blijft **functioneel logisch** (ID-based) tot ~honderden assets per type. Boven **~500–1000** per type worden **library UX**, **load times**, en **duplicate ambiguity** de dominante problemen — niet data corruptie.

---

## Wat bewust nog niet opgelost hoeft te worden

- Global asset registry / dedup engine
- Automatic merge of duplicate characters
- Hard delete blocking when in use (soft warnings volstaan voor nu)
- Pagination (tot library pain bewezen in productie)
- Blob garbage collection job (tot storage metrics alarm)
- Prop recurring detection (P2 na character/location maturity)
- Multi-reference gallery model

---

*Audit uitgevoerd tegen commit `ba1e127` (main).*
