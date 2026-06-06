# Voice Identity & Audio Production Report

## Welke bestaande systemen zijn geïntegreerd

- **ElevenLabs TTS** (`elevenlabs-voice.ts`) — `language_code` wordt nu meegestuurd in de synthesis POST.
- **StudioCharacterVoiceCenter** — inline in workspace Personages-tab en Voice-tab (geen redirect meer).
- **resolveCharacterVoiceIdentity** — enige bron voor scène-overzicht, director voice-sectie en consistency-weergave.
- **buildVoiceIdentityPlan / StudioStoryboardVoiceIdentityPanel** — blijft in Voice-tab voor multi-taal mapping.
- **StudioVoiceDirectorPanel + StudioVoicePreviewPanel** — storyboard voice generatie blijft in Studio workspace.
- **StudioCharacterVoiceHistory** (Prisma) — GET API + UI-panel voor stemgeschiedenis.
- **updateStudioCharacterApi** — inline opslaan van stem, lock en taalprofielen.

## Hoe stem-identiteit nu werkt

1. Elk personage heeft een **huidige stem** (preset), optionele **taalprofielen** en **stem vergrendelen**.
2. In de workspace Personages-tab: samenvatting per personage + uitklapbare **Stem**-editor met preview en geschiedenis.
3. In de actieve scène: **Personage → Stem** overzicht bovenaan de Personages-tab.
4. In Director V2 voice-sectie: dezelfde resolver toont welke stem gebruikt wordt voor de storyboard-taal.
5. Voice-tab: **Audio voor dit videoverhaal**-panel met sprekers, narratie- en ondertitelstatus + storyboard voice preview/generatie.

## Hoe voice consistency wordt bepaald

`resolveCharacterVoiceIdentity` (V39) is de single source of truth:

| Prioriteit | Bron | Voorwaarde |
|------------|------|------------|
| 1 | Vergrendeld basisprofiel | `voiceLock` + geen taal-override |
| 2 | Taalprofiel | `voiceProfilesByLanguage[lang]` |
| 3 | Personage-default | `voiceProfile` op personage |

Storyboard-override (`voiceProfile` op videoverhaal) wordt alleen geprobeerd als het personage niet vergrendeld is. De UI toont **Te gebruiken stem** + bron (Personage / Taalprofiel / Vergrendeld).

## Welke componenten zijn aangepast

| Component | Wijziging |
|-----------|-----------|
| `studio-workspace-scene-assets-panel.tsx` | Scène stemoverzicht + inline voice cards |
| `studio-workspace-tool-panel.tsx` | Audio production panel; inline character voices |
| `studio-workspace-shell.tsx` | `handleCharacterUpdated` sync library + scenes |
| `studio-scene-voice-overview.tsx` | **Nieuw** — scène Personage → Stem |
| `studio-workspace-character-voice-inline.tsx` | **Nieuw** — inline voice center + save |
| `studio-character-voice-history-panel.tsx` | **Nieuw** — stemgeschiedenis UI |
| `studio-workspace-audio-production-panel.tsx` | **Nieuw** — audio productie-overzicht |
| `director-v2/sections/voice-section.tsx` | Gebruikt `resolveCharacterVoiceIdentity` |
| `studio-director-panel-v2.tsx` | Geeft storyLanguage door |
| `elevenlabs-voice.ts` | `language_code` in POST body |
| `studio-character-voice-history.ts` | `listCharacterVoiceHistory` |
| `api/.../voice-history/route.ts` | **Nieuw** GET endpoint |
| i18n `nl.ts` / `en.ts` | Voice identity copy (NL/EN parity) |

## Welke redirects zijn verwijderd

- Voice-tab: links naar `/studio/characters/[id]/edit` vervangen door inline `StudioWorkspaceCharacterVoiceInline`.
- Personages-tab: "Open voice tab"-knop verwijderd; stem beheer is inline.

*(Classic character edit pagina blijft bestaan voor geavanceerde flows.)*

## Welke ElevenLabs verbeteringen zijn doorgevoerd

- **`language_code`** wordt nu meegestuurd bij TTS synthesis (was al in `buildVoiceRequest`, ontbrak in POST body).
- Model blijft `eleven_multilingual_v2` (bestaand).
- Preset handling ongewijzigd via `getVoiceProfilePreset`.
- Geen voice cloning, dubbing, music of SFX toegevoegd.

## Wat nog P2 is

- **Volledige personagebibliotheek** in Personages-tab (nu: personages gekoppeld aan actieve scène + volledige lijst in Voice-tab).
- **Per-scène voice override UI** (scene-level overrides bestaan in schema/director; geen nieuwe editor gebouwd per sprint scope).
- **Ondertitel status live ophalen** in audio panel (nu: status op basis van voiceEnabled; detail in Subtitles-tab).
- **Voice-tab filter op storyboard-personages** — toont nu alle library characters.

## Tests/build status

Zie CI output na `npm run lint`, `npm run build`, `npm run test`.

Nieuwe tests: `src/lib/studio-voice-identity-sprint.test.ts` (resolver, language_code, history export).
