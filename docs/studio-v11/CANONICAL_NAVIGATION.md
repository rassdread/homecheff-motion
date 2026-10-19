# Canonical navigation

| User action | Canonical route | Legacy that must keep working |
|---|---|---|
| Open Studio | `/studio` | `/` stays marketing |
| See films | `/projects` | `/videos` remains the playable-video filter |
| Open a film | `/studio/projects/[id]` | `/studio/storyboards/[id]`, `/videos/[id]` |
| Edit scenes | project shell, scene canvas | `/studio/storyboards/[id]/edit` |
| Characters | `/studio/characters` | `/studio/projects/[id]/character-masters` for Passion masters |
| Media | `/studio/assets/library/generated` | `/library` redirects later |
| Voices | character editor and the voice library already linked there | — |
| Still editor | `/editor` from an image’s properties | do not link it from the main nav |
| Export | project shell export action | `/videos/[id]/versions` |
| HC | `/account/credits` | quote modal does not navigate away until the user asks |

## Redirects (later, not in V11)

- `/library` → media browser.
- `/studio/storyboards` list → `/projects`.
- Storyboard and video **detail** routes stay. They gain a banner “Open in project” once the shell can do the job. They are not deleted.
- `/animate/instant/*` stays for the existing checkout. The film workspace does not link to it.

## Deep links

Project, storyboard, video, and character ids in URLs stay valid. The shell reads `storyboardId` and `animationProjectId` when they are set. Passion has both null, so the shell must also find characters by project id.

## Component reuse

- `studio-project-media-browser.tsx` for every media grid.
- Character editor for every voice and clothing change.
- Storyboard scene components inside the shell.
- Video player from the video page for preview.
- One quote dialog from the credit UI.

Do not mount the old unfiltered asset dump. V10 removed that injection. Keep it removed.
