# Voice Provider ID Secondary Crash Fix Report

## Root cause

The first fix guarded persona preset **render** in `StudioCharacterVoiceLibrarySection`, but **`buildPerLanguageVoiceOverrideOptions()`** in `studio-character-voice-center.tsx` still called **`formatClonedVoiceProfileRef(clone.cloneId)` during React render** (inside each per-language `<select>`).

When the user clone library contained an entry with an empty `cloneId` (or corrupt manifest data), every render of the Voice Center crashed with **`Provider voice id is required.`**

## Tweede crashpad

| Path | Trigger |
|------|---------|
| **Per-language override dropdown** | `buildPerLanguageVoiceOverrideOptions` → strict `formatClonedVoiceProfileRef` on each clone during render |
| **Invalid `includeProfile`** | Stored `library:` / `clone:` passed into dropdown builder without validation |
| **My Voices row select** | Strict formatter if `cloneId` empty (click path; now guarded) |
| **Stored character data** | `library:`, `clone:`, `library:undefined` loaded into form state |

Persona render, Production Brief, and AI Director suggestion builders already filter `preset.available` — not secondary crash sources.

## Welke component nog strict formatter gebruikte

- **`studio-character-voice-center.tsx`** — `buildPerLanguageVoiceOverrideOptions` (primary)
- **`studio-my-voices-section.tsx`** — clone select handler (secondary)
- **`studio-user-voice-library.ts`** — `mergeCloneRecord` fallback (server-side)

Strict formatters remain for API paths with guaranteed IDs (`registerUserVoiceClone`, ElevenLabs clone response).

## Hoe invalid stored refs worden behandeld

Central policy in `studio-voice-profile-ref.ts`:

- `isInvalidProviderVoiceProfileRef()` — detects `library:`, `clone:`, `library:undefined`, `clone:null`
- `coerceVoiceProfileForStorage()` — never persists invalid refs
- `resolvePlanningVoiceProfile()` — falls back to `warm_narrator` for invalid provider refs in planning
- `characterHasExplicitVoiceChoice()` — returns false for invalid refs

Voice Center UI when invalid ref detected:

- Banner: **Deze stem is niet beschikbaar**
- Button: **Gebruik standaardstem** → resets to `warm_narrator` and clears invalid per-language overrides

## Hoe UI-crashes zijn voorkomen

- UI render uses **`safeFormatClonedVoiceProfileRef` / `safeFormatLibraryVoiceProfileRef` only**
- Dropdown `add()` skips invalid refs via `isInvalidProviderVoiceProfileRef`
- Persona onClick uses safe formatter (defense in depth)
- My Voices skips rows with empty `cloneId`
- Preview/synthesis still blocked by `validateVoiceProfileForSynthesis` (400, no TTS)

## Tests/build status

New tests: `src/lib/studio-voice-provider-voice-id-secondary-fix.test.ts` (added to `package.json` test script).

| Check | Status |
|-------|--------|
| `npx prisma validate` | pass |
| `npx prisma generate` | pass |
| `npm run lint` | pass (0 errors, 177 warnings) |
| `npm run build` | pass |
| `npm run test` | **1968/1968** pass |

Also fixed lint error in `studio-voice-clone-workflow.tsx` (sync setState in effect) from completion sprint work.
