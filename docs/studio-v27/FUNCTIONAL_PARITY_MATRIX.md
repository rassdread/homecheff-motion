# Functional parity matrix

Compared by route and payload shape. No live provider output was generated, so visual quality is not claimed to match.

| Workflow | Original found | Settings kept | Reference image | Prompt builder | New entry | Wizard opens | Quote on open | Film handoff |
|---|---|---|---|---|---|---|---|---|
| Photo to video | Yes, `PhotoVideoComposer` | Idea query | HTTP `sourceImage` only. Local upload stays in the wizard. | Local encode has no provider prompt. | Chip `photo_video` | Yes | 0 HC | `returnTo` when a safe project path is present |
| Product photo | Yes, editor | `experience=BUSINESS_PRODUCT`, idea | HTTP `sourceImage` | Editor instruction / fusion builders | Chip `product_photo` | Yes | 0 HC | Editor `returnTo` |
| Image edit | Yes | Idea | Editor upload and reference edit adapter | `buildEditorInstructionPromptV3` | Free text and logo chip | Yes | 0 HC | Scene link |
| Advertisement | Yes, Quick Ad | Idea seeds story. HTTP image seeds the photo. | Yes when the URL is HTTP | `generateQuickAdProject` | Chip and `reclamevideo` | Yes | 0 HC until the existing confirm | Not automatic |
| Social video | Experience pack only, continue looped | Photo intent prefill, user idea appended | Wizard upload | `buildPhotoIntentPrefillPackage` then Instant prompt | Chip `social_video` | Instant | 0 HC | Not automatic |
| Animation | Motion hub and Instant | `photoIntent=photo_to_video` | HTTP `sourceImage` on `/motion/start` | Same photo-intent prompt | Chip `animation` | Instant | 0 HC | Scene link |
| Motion presets | Preset registry and prefill | `?preset=` still applied by `MotionHubQueryPrefillApplier` | Showcase URL when the hub passes it | `promptTemplate` via prefill | Hub, not a homepage chip | Yes when a preset query is present | Prefill `creditsConsumed: 0` | Unchanged |
| Voice | Library and `buildVoiceRequest` | Idea on the library URL | No | Existing voice request | Free text only | Library, not a synthesis form | 0 HC | Film audio section |
| Music / SFX | Generate-music route and library | Idea on the library URL | No | Caller prompt or `${mood} ${genre} instrumental` | Free text only | Library | 0 HC until that route | Film audio section |
| Storyboard | Production brief | Idea seeds an empty brief | Brief's own uploads | Scene prompt builder after the brief | Chip `story` | Yes | 0 HC | Production link when a storyboard id exists |
| Film | Unified project workspace | Description stored on create | Scene image passed into wizard links | Existing scene and production builders | Explicit film confirm only | Workspace, then linked wizards | Create does not call a video provider in the composer | Native |
| Presentation | Experience pack | Idea on the storyboard brief | Brief uploads | Storyboard builders | Chip `presentation` | Storyboard brief | 0 HC | Same as storyboard |

`npm` test file `src/lib/studio-v27-workflow-routes.test.ts` checks the route table, prompt append, example sentences, social Instant handoff, film scene links, and still-adapter reference order. It does not compare two live provider responses.
