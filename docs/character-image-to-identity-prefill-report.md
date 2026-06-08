# Character Image-to-Identity Prefill Report

## Audit

| System | Status | Path |
|--------|--------|------|
| Reference upload | Reused | `postWizardImageUpload`, `/api/uploads/images` |
| Character Identity Builder | Reused | `studio-character-identity-builder.tsx` |
| Brief prefill | Reused | `buildCharacterIdentitySuggestionFromPrefill` |
| Compare / apply UI | Reused | `diffCharacterIdentityForm`, `mergeCharacterIdentityForm`, `applyAiSuggestion` |
| Studio Vision QA | Not reused (wrong task) | scene consistency only |
| OpenAI multimodal | Reused pattern | `openai-preflight-vision.ts` → new extraction module |
| Preset catalog | Reused | `studio-character-identity-presets.ts` |

Gap before sprint: upload stored `referenceImageUrl` only — no identity extraction.

## Hoe image analysis werkt

1. User uploads 1–5 images via existing preprocess + Blob pipeline.
2. `POST /api/studio/characters/analyze-reference-images` sends URLs + description + usage to OpenAI Vision (`analyze-character-reference-images.ts`).
3. JSON extraction mapped by `buildCharacterIdentityPrefillFromImages()` to preset ids and form fields.
4. Requires `OPENAI_API_KEY`; returns 503 when not configured.

## Hoe multi-image upload werkt

- Up to 5 slots with roles: primary, reference, closeup, outfit, style.
- Only **primary** sets `referenceImageUrl` / `referenceStorageKey` (existing schema).
- Extra images are analysis-only (no new media architecture).
- UI: `StudioCharacterImagePrefillPanel`.

## Hoe presets worden vooringevuld

Keyword + id matching in `studio-character-identity-image-prefill.ts`:

- Types, styles, shapes, energy, colors → preset ids
- Outfit / accessory / personality → preset labels via i18n
- Free-text fallback when no preset match (e.g. custom clothing description)

## Hoe gebruiker kan aanpassen

- Analysis does **not** auto-apply.
- Review card: **Studio recognized this** / **Studio heeft dit herkend**
- **Use proposal** / **Gebruik voorstel** → explicit `mergeCharacterIdentityForm`
- Identity Builder remains editable; compare/apply banner for image suggestions
- Save only on form submit (unchanged)

## Welke systemen zijn hergebruikt

- Character create form + entry choice flow
- Identity Builder accordions and preset chips
- Image upload client + validation
- `CharacterIdentityFormValues` ↔ PATCH mapping
- OpenAI gated request pattern

## Wat bewust niet gebouwd is

- No new image generator or provider
- No schema migration (single reference image on save)
- No auto-save / auto-publish
- No reuse of Studio Vision QA prompts
- No persistent storage of extra reference slots

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | pass |
| `npx prisma generate` | pass |
| `npm run lint` | pass (0 errors) |
| `npm run build` | pass |
| `npm run test` | **1977/1977** pass |

New tests: `src/lib/studio-character-identity-image-prefill.test.ts`
