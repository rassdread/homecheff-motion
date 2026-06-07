# Voice Library Discovery UX Fix Report

**Date:** 2026-06-06  
**Scope:** Make existing Voice Library / Persona / Mijn stemmen discoverable on Character Create/Edit (no new voice systems).

## Root cause

Provider-wiring worked, but **UX gates hid the library**:

- `voiceEnabled` default `false` on create disabled all source tabs
- Default tab was `presets` (6 legacy moods only)
- Voice Library lived below Persona presets on a tab labeled “Persona-stem”
- Browse/select/preview required `voiceEnabled === true`

Users never reached the library without knowing hidden steps.

## Wat zichtbaarheidsprobleem was

| Symptom | Cause |
|---------|--------|
| Only 6 presets visible | Default tab `presets` + disabled tabs when voice off |
| Persona/library “missing” | Tab disabled + buried under wrong tab label |
| Mijn stemmen empty/hidden | Tab disabled; weak empty state |
| Preview blocked | `runPreview` returned early when `!voiceEnabled` |

## Hoe Create Character nu werkt

1. Voice section shows **“Kies een stem”** with three always-clickable tabs (44px touch targets).
2. **Default tab: Persona & bibliotheek** (`defaultVoiceLibraryTab()` → `persona` for legacy presets).
3. Top of tab: **discovery CTA** + accent search copy → **Stemmenbibliotheek** (filters + voice cards) → Persona presets below.
4. If voice not enabled: sky hint explains enable-for-render; browsing/preview still works.
5. **Selecting any voice** sets `voiceEnabled: true` automatically.

## Hoe Edit Character nu werkt

Same component stack via `StudioCharacterForm`. Existing `clone:` profiles open **Mijn stem** tab; `library:` opens **Persona & bibliotheek**; legacy presets open Persona tab (not presets) for discovery — user can switch to Preset-stem to see legacy selection.

## Hoe preview zonder enable werkt

- Removed `if (!value.voiceEnabled) return` from `runPreview`.
- Preview textarea and per-language preview button no longer gated by `voiceEnabled`.
- Library row audio players (`StudioAudioPreviewPlayer`) were never gated.

## Hoe voice selection werkt

`handleSelectProfile` in `StudioCharacterVoiceCenter`:

```tsx
onChange({ ...value, voiceEnabled: true, voiceProfile: ..., voiceDescription: ... })
```

Applies to presets, persona, library browse, and clones (via shared callback).

## Hoe Persona-stem zichtbaarer is

- Tab renamed: **“Persona & bibliotheek”** / **“Persona & library”**
- Default tab on new characters
- **Stemmenbibliotheek moved above** persona presets with CTA card:
  - NL: “Ontdek stemmen met accenten” + “Zoek stemmen op accent, taal en stijl.”

## Hoe Mijn Stemmen zichtbaarer is

- Tab always clickable
- Heading: **“Maak of kies je eigen stem”** / **“Create or choose your own voice”**
- Clone workflow shown immediately when tab opens (`canModify`)
- Empty clone list still shows workflow + empty copy

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/components/studio/studio-character-voice-center.tsx` | Default tab, choose-voice UI, preview/selection behavior |
| `src/components/studio/studio-character-voice-library-section.tsx` | Library-first layout, CTA, no browse disable gates, mobile targets |
| `src/components/studio/studio-my-voices-section.tsx` | Discovery copy, always-interactive rows |
| `src/i18n/locales/nl.ts` / `en.ts` | Discovery i18n keys |
| `src/lib/studio-character-form-voice-wiring.test.ts` | Discovery + behavior tests |

## Wat bewust niet gebouwd is

- No new providers, APIs, schema, voice library, or clone systems
- No separate “Voice Library” top-level tab (library remains under Persona & bibliotheek by design — smallest safe change)
- Character detail read-only page unchanged
- Per-language override selects still require `voiceEnabled` (advanced section)

## Tests/build status

Run `npm run test` for full suite including `studio-character-form-voice-wiring.test.ts`.

Coverage includes: default persona tab, choose-voice UI, preview without enable, selection enables voice, discovery CTA, my voices discovery, mobile min-heights, NL/EN parity.
