# Route inventory

Inspected `src/app/**/page.tsx` on 2026-10-19 (132 page modules). Authorization for studio data routes is `requireActiveUser` unless noted. Admin routes use `requireAdmin`. Signed-out production users hit silent SSO; that is not a content page.

Status values: **CURRENT** (unique, linked from product chrome), **LEGACY** (still reachable, overlapping purpose), **MARKETING** (public, not the workspace).

| Route | Purpose | Current UI | Backend | Entry | Auth | Status | Duplicates | Future role |
|---|---|---|---|---|---|---|---|---|
| `/` | Marketing home | Landing | none for studio data | direct | public | MARKETING | `/hoe-het-werkt` | Keep outside workspace |
| `/studio` | Studio home | Dashboard cards | insights, continue projects | nav | session | CURRENT | `/studio/my-studio`, `/projects` | Canonical dashboard |
| `/projects` | Mijn projecten | Mixed storyboard, motion, creative cards | `listStudioProjectsForUser` | Studio home | active user | CURRENT | `/videos`, `/studio/storyboards` | Project index only; open the workspace |
| `/studio/projects/[projectId]` | Creative project shell | Project page | `StudioCreativeProject` | project card | owner | CURRENT | storyboard and video pages | Canonical project shell |
| `/studio/projects/[projectId]/character-masters` | Passion masters | Generate/confirm panel | passion runtime, OpenAI image | project | owner + cost confirm | CURRENT | `/studio/characters` | Keep; do not regenerate existing masters |
| `/studio/storyboards` | Storyboard list | List | `StudioStoryboard` | assets/workspace | owner | LEGACY list | `/projects` | Redirect list into project index later |
| `/studio/storyboards/[id]` | Storyboard workspace | Scenes, images, voice, audio panels | scenes, images, jobs | project continue | owner | CURRENT unique | `/classic`, `/edit`, `/movie-builder`, `/production` | Scene canvas inside the film workspace |
| `/studio/storyboards/[id]/classic` | Older storyboard layout | Classic editor | same storyboard | deep link | owner | LEGACY | main storyboard page | Keep deep link; do not feature |
| `/studio/storyboards/[id]/edit` | Scene edit | Edit form | scene APIs | storyboard | owner | CURRENT slice | main page | Properties panel, not a separate app |
| `/studio/storyboards/[id]/movie-builder` | Guided film steps | Builder | storyboard + director brief | storyboard | owner | PARTIAL | director wizard | Fold into AI director panel |
| `/studio/storyboards/[id]/production` | Production overview | Production panels | audio, subtitles, export prep | storyboard | owner | PARTIAL | `/videos/[id]` | Right panel of workspace |
| `/videos` | Completed motion gallery | Bundle cards, playback | animation projects with a video URL | assets hub | owner | CURRENT for playback list | library Videos tab | Library category, not a second home |
| `/videos/[id]` | Motion project | Large client page: versions, repair, language export, playback | `AnimationProject`, exports, renders | Open project | owner | CURRENT unique editing | storyboard page | Scene animation detail until timeline exists |
| `/videos/[id]/versions` | Render versions | Version list | `ProjectRenderVersion` | video page | owner | CURRENT | edit-version | Version drawer |
| `/videos/[id]/edit-version` | Version notes/edit | Form | render version | video page | owner | CURRENT | versions | Keep as version action |
| `/animate`, `/animate/[id]`, `/animate/instant/*` | Instant premium funnel | Checkout and progress | instant premium orders | marketing/create | mixed | LEGACY funnel | `/videos` | Do not use as film workspace |
| `/editor`, `/editor/fuse`, `/editor/transform`, `/editor/start` | Image fusion editor | Canvas | `EditorCanvasProject`, OpenAI | nav | owner | CURRENT for stills | storyboard image gen | Still editor, linked from image properties |
| `/studio/characters` | Character list | Cards | `StudioCharacter` | assets hub | owner | CURRENT | character-masters | Canonical character library |
| `/studio/characters/[id]` and `/edit` | Character editor | Identity, clothing, voice | character service | list | owner | CURRENT | masters panel | Canonical editor |
| `/studio/characters/new`, `from-reference`, `prepare`, `motion-ready` | Creation flows | Wizards | character + vision | characters | owner | PARTIAL overlap | `/edit` | One create flow; keep motion-ready as a step |
| `/studio/assets/library/generated` | Project media browser | V10 categories, search, sort, page | scene images, animation videos, audio blob | library | owner | CURRENT | `/videos`, asset registry | Canonical media browser |
| `/studio/assets/[group]/[subsection]` | Asset hub | Characters, worlds, uploads, references | registry assembly | assets | owner | CURRENT for non-film assets | generated browser | Keep for characters, locations, props, uploads |
| `/studio/locations`, `/studio/props`, `/studio/worlds` | World building | CRUD | matching models | hub | owner | CURRENT | storyboard scene fields | Reuse from scene properties |
| `/library` | Older library landing | Hub | counts | nav | session | LEGACY entry | `/studio/assets` | Redirect to media browser |
| `/studio/workspace` | Workspace entry | Handoff into storyboard tools | storyboard | studio | owner | PARTIAL | storyboard page | Becomes the film workspace route |
| `/studio/simple`, `/studio/quick-ad`, `/studio/start` | Short flows | Intent forms | routing into storyboard/motion | home | owner | PARTIAL | movie builder | Simple mode of the same workspace |
| `/studio/production` | Production home | Status | providers | studio | owner | PARTIAL | storyboard production | Job tray |
| `/account/credits`, `/account/billing`, `/mijn-verbruik` | HC and billing | Wallet UI | `StudioWallet`, ledger | account | owner | CURRENT | — | Cost approval stays here and inline |
| `/admin/billing/*` | Finance admin | Admin tables | ledger, jobs | admin | admin | CURRENT | — | Not user workspace |
| `/pricing` | Public prices | Marketing | catalog | public | public | MARKETING | account credits | Keep public |

## Recommendation

One project opens `/studio/projects/[id]`. That shell embeds the storyboard canvas, the media viewer, and later the timeline. `/videos/[id]` and `/studio/storyboards/[id]` stay as deep links until the shell covers their unique actions. Do not delete them in the first phase.
