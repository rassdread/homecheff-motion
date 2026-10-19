# Route changes

| Route | Change |
|---|---|
| `/studio/projects/[id]` | Replaced the short resource list with the unified workspace |
| `/api/studio/projects/[id]/workspace` | New read-only GET |
| `/studio/projects/[id]/character-masters` | Unchanged |
| `/api/studio/creative-projects/[id]` | Unchanged. Still touches `lastOpenedAt`. The workspace does not call it |
| `/videos`, `/videos/[id]`, `/studio/storyboards`, `/studio/storyboards/[id]/classic`, `/animate/instant/*`, `/library`, `/editor` | Unchanged |

Creative projects in Mijn projecten already open `/studio/projects/[id]`. Storyboard and motion projects keep their own cards and deep links. They are not merged.

No redirects were added, so there is no new loop.
