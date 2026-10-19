# Feature inventory

Evidence is from code on `78396bc4`. **Working** means a UI path and a service exist. It does not mean a signed-in browser test was run in V11. Browser E2E was not executed.

Classes: A UI-accessible, B backend-only, C partial, D present but broken or stale, E duplicated, F not implemented.

| Feature | Class | Where | Service / model | Provider | Owner check | HC | Reuse |
|---|---|---|---|---|---|---|---|
| Studio home and project list | A | `/studio`, `/projects` | `listStudioProjectsForUser` | — | yes | — | Project index |
| Creative project record | A | `/studio/projects/[id]` | `StudioCreativeProject` | — | yes | — | Film shell. Passion has null storyboard and animation links |
| Storyboard and scenes | A | `/studio/storyboards/[id]` | `StudioStoryboard`, `StudioScene` | — | yes | — | Scene canvas |
| Scene image generation | A | storyboard scene actions | `StudioSceneImage`, capability `IMAGE_GENERATE` | OpenAI `gpt-image-1` | yes | reserved via `authorizeStudioAction` | Scene stills |
| Character masters | A | character-masters page | passion runtime | `gpt-image-1`, 1024×1536, high, 125 HC | owner of project | explicit confirm | Do not regenerate Baker, Potter, Gardener |
| Character identity and voice fields | A | character editor | `StudioCharacter` | — | yes | voice preview is a separate confirm | Reuse across scenes via `StudioSceneCharacter` |
| Voice catalog, filters, favorites | A | voice library UI | `StudioVoiceCatalogEntry`, characteristics, favorites | ElevenLabs metadata sync, no synthesis on search | yes | preview confirm | Character voice picker |
| Paid voice preview | A | voice panels | TTS preview route | ElevenLabs | yes | quote then confirm | Director must use the same confirm |
| Animation project and Vidu segments | A | `/videos/[id]` | `AnimationProject`, `AnimationTransition` | Vidu (`vidu_motion`) | yes | motion render pricing | Image-to-video for scenes |
| Final export and render versions | A | video page | `AnimationExport`, `ProjectRenderVersion` | local merge + provider | yes | render actions | Export pipeline |
| Language export | C | video page | `VideoLanguageExport` | overlay, not a new Vidu job when text-only | yes | separate | Dutch subtitles path exists for motion, not a full subtitle editor |
| Project media library | A | `/studio/assets/library/generated` | read-time union of scene images and playable videos | storage URLs already stored | session owner only | — | Canonical media browser |
| Archive / failed buckets | A | same browser | classification, no deletes | — | owner | — | Keep |
| User audio library | C | audio APIs and Audio tab | blob manifest, not a timeline | upload; generate routes exist | yes | music/sfx capabilities priced | Beds, not scored scenes |
| Music and SFX generation capabilities | C | capability registry | `MUSIC_GENERATE`, `SFX_GENERATE` | ElevenLabs adapters declared | yes when called | priced | Not a mixer |
| Subtitle transcription capability | C | `SUBTITLE_GENERATE` | storyboard subtitle model `StudioStoryboardSubtitleTrack` | ElevenLabs STT adapter id | yes when called | priced | Track data exists; no shared timeline |
| Image editor / fusion | A for stills | `/editor` | `EditorCanvasProject` | OpenAI image | yes | fusion cost | Still tool, not film timeline |
| Director briefing wizard | C | `studio-v11-director-wizard.ts` | in-memory brief | none | n/a | none | Questions only. Not an executor |
| Scene/music/voice “directors” | C | `studio-scene-director`, `studio-sound-director` | prompt and plan builders | none by themselves | n/a | none | Planning helpers |
| Instant premium funnel | E | `/animate/instant` | separate order model | Vidu path | yes | checkout | Do not duplicate inside the film workspace |
| Kling and Runway flags | B | `studio-provider-capabilities.ts` | flags only | no `kling_` or `runway_` adapter under `src/server` | — | — | Do not advertise as live |
| Shared NLE timeline | F | comment in `studio-creative-workflow.ts`: list order, not an NLE | none | — | — | — | New model, reuse scene order |
| AI tool execution | F | no director tool router that calls generation services | — | — | — | — | Build on `authorizeStudioAction` |
| Inpainting as a product mode | C | image edit capability exists | `IMAGE_EDIT` | OpenAI | yes | priced | Not verified as a full mask editor in the film flow |

## Counts used in the report

These are capability groups, not every function:

- Fully in the UI: 12 (home/projects, creative project, storyboard, scene images, characters, voice catalog, voice preview, animation/Vidu, export, media library, image editor, character masters).
- Backend or capability-only: 4 (Kling/Runway flags, translate capability, some generation adapters without a dedicated film screen, admin reconciliation).
- Partial: 8 (language export, audio library, music/sfx, subtitles, director wizard, planning directors, creative-project links, image edit in the film flow).
- Duplicated surfaces: 4 (project lists, libraries, storyboard variants, instant funnel versus `/videos`).
- Missing: 2 product capabilities (shared timeline, executable AI director).

Stale rendering projects and two missing video files are data states from V10, not missing features. They were quarantined in the library and not deleted.
