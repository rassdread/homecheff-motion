# Character Image & Prompt to Identity Prefill Report

## Audit

| System | Existing prefill | Reused in sprint |
|--------|------------------|------------------|
| Build New / brief | `buildCharacterIdentitySuggestionFromPrefill` | Yes |
| AI Director compare | `diffCharacterIdentityForm`, `applyAiSuggestion` | Yes |
| Identity Spec Engine | `toIdentitySpec`, `identityCompleteness` | Yes |
| Presets | `studio-character-identity-presets.ts` | Yes — sole matching source |
| Reference upload | `/api/uploads/images` | Yes |
| Image vision extract | OpenAI multimodal (new extraction prompt) | Yes — not Studio Vision QA |
| Prompt → identity | **None before sprint** | **New** — heuristic `buildCharacterIdentityPrefillFromPrompt` |

Text fields already mapped via `characterIdentityFormToPatch` → `visualKeywords`, `continuityNotes`, etc.

## Hoe prompt prefill werkt

1. User enters description (+ optional usage, brand rules) on **`prompt_prefill`** entry path.
2. Client calls **`buildCharacterIdentityPrefillFromPrompt()`** — heuristic keyword/preset matching (no API, no auto-save).
3. Review card: **Studio stelt dit voor** / **Studio suggests this**.
4. **Gebruik voorstel** → explicit `mergeCharacterIdentityForm`.

Examples (chef / designer prompts) map to mascot, cartoon style, HomeCheff color, outfit/accessory presets, forbidden elements, voice hints.

## Hoe image prefill werkt

1. User uploads 1–5 images with roles (primary, reference, close-up, outfit, style).
2. **`POST /api/studio/characters/analyze-reference-images`** → OpenAI Vision JSON.
3. **`buildCharacterIdentityPrefillFromImages()`** maps to presets via shared matching module.
4. Primary image → `referenceImageUrl` (existing schema).

## Hoe image + prompt merge werkt

When both description and images are provided:

- Server runs image extract + **`buildCharacterIdentityPrefillFromPrompt`** on description.
- **`mergeCharacterIdentityPrefills()`** combines:
  - **Prompt wins:** personality, usage, forbidden elements, description, name
  - **Image wins:** visual style, colors, outfit, accessories, appearance memory, energy
- **Conflicts** detected on colorTheme, clothing, visualStyle, accessories → amber warning in review UI.

## Hoe presets worden gematcht

Shared module: **`studio-character-identity-prefill-matching.ts`**

- Keyword maps for type, style, shape, energy, color, outfit, accessory, personality
- Preset IDs preferred; free text only when no preset match (e.g. custom clothing detail)
- i18n labels for outfit/accessory/personality chips via existing preset keys

## Hoe conflicts worden getoond

`StudioCharacterPrefillReviewCard` lists conflicts with i18n keys under `studio.characters.prefill.conflict.*`

Example NL: *Controleer kleurthema — omschrijving en afbeelding lijken te verschillen.*

## Hoe voice hints werken

**`buildCharacterVoiceHintFromPrefill()`** — advisory only:

- Chef outfit → warm chef / friendly narrator
- Garden → calm community voice
- Designer → creative/fashion voice
- British / Jamaican / Dutch context → accent filter hint string

Prefilled into `voiceDescription` only when user clicks **Gebruik voorstel** and field was empty. No auto-select in Voice Library.

## Welke systemen zijn hergebruikt

- Character create form + 4 entry paths on `/studio/characters/new`
- Character Identity Builder + compare/apply pattern
- Image upload pipeline
- OpenAI gated request pattern (images only)
- NL/EN i18n

## Wat bewust niet gebouwd is

- No image generator
- No new provider (beyond existing OpenAI vision for images)
- No schema migration
- No auto-save / auto-create character
- No new Identity Builder or preset engine
- No LLM for prompt path (heuristic only; optional future enhancement)

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | pass |
| `npx prisma generate` | pass |
| `npm run lint` | pass (0 errors) |
| `npm run build` | pass |
| `npm run test` | **1985/1985** pass |

New/updated tests:

- `src/lib/studio-character-identity-prompt-prefill.test.ts`
- `src/lib/studio-character-identity-image-prefill.test.ts`

Key files:

- `studio-character-identity-prompt-prefill.ts`
- `studio-character-identity-prefill-matching.ts`
- `studio-character-identity-prefill-merge.ts`
- `studio-character-identity-voice-hints.ts`
- `studio-character-prefill-review-card.tsx`
- `studio-character-prompt-prefill-panel.tsx`
