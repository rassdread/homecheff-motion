# Voice Library UI Wiring Fix Report

**Date:** 2026-06-06  
**Scope:** Connect existing Voice Library UI to Character Create/Edit (no new voice systems).

## Root cause

`StudioCharacterForm` rendered `StudioCharacterVoiceProfilePanel` (= `StudioCharacterVoiceCenter`) **without** `VoiceLibraryProvider` or `UserVoiceLibraryProvider`. Without those providers:

- `useOptionalVoiceLibrary()` returned `null` → Persona-tab content returned `null` (no fetch).
- `useOptionalUserVoiceLibrary()` returned `null` → Mijn stem-tab returned `null`.
- Default tab `presets` showed only the 6 legacy `STUDIO_VOICE_PROFILE_IDS`.

The workspace path (`StudioWorkspaceCharacterVoiceInline`) already had the correct provider stack.

## Welke bestaande systemen zijn hergebruikt

| System | Location |
|--------|----------|
| `VoiceLibraryProvider` | `src/components/studio/studio-voice-library-provider.tsx` |
| `UserVoiceLibraryProvider` | `src/components/studio/studio-user-voice-library-provider.tsx` |
| `StudioCharacterVoiceCenter` / profile panel alias | `studio-character-voice-center.tsx`, `studio-character-voice-profile-panel.tsx` |
| `StudioCharacterVoiceLibrarySection` | Persona presets, filters, search, library browse |
| `StudioMyVoicesSection` + clone workflow | Mijn stem tab |
| `GET /api/studio/voice-library` | `buildVoiceLibraryCatalog()`, `buildVoicePersonaPresets()` |
| `GET /api/studio/user-voice-library` | User clone library (module cache) |
| Client cache | `studio-voice-library-client.ts`, `studio-user-voice-library-client.ts` |

## Wat is aangesloten

### P1 — Provider wiring (`studio-character-form.tsx`)

```tsx
<VoiceLibraryProvider>
  <UserVoiceLibraryProvider>
    <StudioCharacterVoiceProfilePanel … canModify />
  </UserVoiceLibraryProvider>
</VoiceLibraryProvider>
```

Same nesting as `StudioWorkspaceCharacterVoiceInline`.

### P5 — Per-taal overrides (`studio-character-voice-center.tsx`)

Added `buildPerLanguageVoiceOverrideOptions()` so per-language `<select>` includes:

- 6 legacy presets (unchanged fallback)
- Persona presets (`library:<voiceId>`)
- Catalog voices for that language (max 48, deduped)
- User clones (`clone:<id>`)
- Current override value if not already listed (edit safety)

## Hoe Create Character nu werkt

1. Route `/studio/characters/new` → `StudioCharacterForm`.
2. On mount, `VoiceLibraryProvider` subscribes → **one** `GET /api/studio/voice-library` (session cache).
3. `UserVoiceLibraryProvider` subscribes → **one** `GET /api/studio/user-voice-library` (session cache).
4. Voice Center shows three source tabs:
   - **Preset-stem** — 6 legacy presets
   - **Persona-stem** — 14 persona presets + Stemmenbibliotheek (accent/gender/taal/leeftijd filters + zoek)
   - **Mijn stem** — clone list or empty state + clone workflow (`canModify`)

## Hoe Edit Character nu werkt

Identical wiring via the same `StudioCharacterForm` on `/studio/characters/[id]/edit`. Existing `library:` / `clone:` profiles open on the correct tab via `inferVoiceLibraryTab()`.

## Hoe Voice Library API wordt aangeroepen

- **Trigger:** first `VoiceLibraryProvider` mount → `subscribeVoiceLibraryStore()` in `studio-voice-library-client.ts`.
- **Endpoint:** `GET /api/studio/voice-library`
- **Server:** `buildVoiceLibraryCatalog()` + `buildVoicePersonaPresets()` + `buildVoiceLibraryFilterOptions()`
- **Caching:** module-level client cache (1h TTL); server catalog cache (1h TTL). No per-card fetch.

User clones: `subscribeUserVoiceLibraryStore()` → `GET /api/studio/user-voice-library`.

## Hoe Persona Presets zichtbaar zijn

Tab **Persona-stem** → `StudioCharacterVoiceLibrarySection` with `activeTab === "persona"` renders `payload.personaPresets` grouped by chef/garden/designer/community, then the **Stemmenbibliotheek** browse block with filters.

Requires `library.payload` from provider (now available on create/edit).

## Hoe Mijn Stemmen zichtbaar zijn

Tab **Mijn stem** → `StudioMyVoicesSection` via `useOptionalUserVoiceLibrary()`.

- Clones present → grid of clone rows + rename
- Empty → `studio.myVoices.empty` + `StudioVoiceCloneWorkflow` when `canModify`

## Wat bewust niet gebouwd is

- No new providers, APIs, schema migrations, or UI concepts
- No duplicate Voice Library / Persona / Clone implementations
- No full library browse inside per-language dropdown (compact select only; full browse remains on Persona tab)
- Character detail page (`/studio/characters/[id]`) still has no voice editor (unchanged)

## Wat P1 blijft

- **Character detail view:** voice editing only on edit form / workspace, not on read-only detail page.
- **Per-language override UX:** dropdown lists presets + persona + filtered catalog + clones; for full filter/search experience users should use the main Persona tab (same as workspace).
- **Dedicated “Voice Library” top-level tab:** library browse lives under Persona-stem (by design in sprint UI).

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | Pass |
| `npx prisma generate` | Pass |
| `npm run lint` | Pass (pre-existing warnings only) |
| `npm run typecheck` | Pre-existing repo errors unrelated to this change |
| `npm run build` | Pass |
| New tests | `src/lib/studio-character-form-voice-wiring.test.ts` — **10/10 pass** |
| Full `npm run test` | Includes new file in script; run in CI/local for full count |

### New test coverage

- Character form provider nesting (VoiceLibrary + UserVoiceLibrary wrap panel)
- Workspace inline providers unchanged
- Create/edit pages use `StudioCharacterForm`
- `buildPerLanguageVoiceOverrideOptions` — presets, persona/library refs, clones, orphan override
- NL/EN i18n parity for voice library keys
