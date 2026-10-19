# Provider capabilities

Configured, implemented, and tested are different. V11 made no provider calls.

## Image

| | |
|---|---|
| Configured | `IMAGE_GENERATE`, `IMAGE_EDIT`, `FUSION_RENDER` → `openai_image` |
| Implemented | Scene image route and character-master runtime. Master lock is `gpt-image-1`, size `1024x1536`, quality high, 125 HC, confirmed in `studio-passion-character-masters.test.ts` |
| Tested in V11 | Unit tests exist. No new generation |
| Not in the live adapter set | Kling and Runway image/video flags in `studio-provider-capabilities.ts` have no server adapter |

Reference images exist on `StudioCharacter.referenceImageUrl`. Scene generation can take storyboard context. A guaranteed character-lock across every scene is **not** proven by a browser test here. The masters are stored and must be passed as references, not regenerated.

## Video

| | |
|---|---|
| Configured | `VIDEO_GENERATE` and `RENDER` → `vidu_motion`, async poll |
| Implemented | `src/server/studio-generation/vidu-motion-adapter.ts`, animation transitions, exports, render versions |
| Modes in product | Image-to-video segments and story/multiframe instant mode on `AnimationProject` (`instantMode`, durations 3/5/8 seconds in schema comments) |
| Not implemented as the default path | Text-to-video as a separate film action, Runway, Kling |
| Tested in V11 | No generation. V10 ffprobe checked 29 existing finals |

Playback of an existing file is not the same as a successful new generation.

## Voice and audio

| Capability | Adapter id | Scope in registry |
|---|---|---|
| `VOICE_TTS` | `elevenlabs_tts` | project |
| `VOICE_CLONE` | `elevenlabs_clone` | user |
| `MUSIC_GENERATE` | `elevenlabs_music` | project |
| `SFX_GENERATE` | `elevenlabs_sfx` | user library bed, not timed hits |
| `SUBTITLE_GENERATE` | `elevenlabs_stt` | project |
| `TRANSLATE` | `openai_translate` | project |

The voice **catalog** (about 20,272 eligible rows after V8, characteristic index in V9.4) is metadata. Search does not synthesize. Preview is a paid call with confirmation.

## Accounting

`ProviderUsageLog` and `ProviderCostEvent` exist. Whether every Vidu and ElevenLabs call writes them was not re-audited call-by-call in V11. The HC side is `authorizeStudioAction` → `reserveStudioCredits` → `captureStudioActionReservation` or `refundStudioActionReservation`.
