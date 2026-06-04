# Studio AI Production Center (V29)

Final planning layer before image, voice, or video generation.

## Shipped

- Production Center panel + `/studio/storyboards/[id]/production` page
- Provider env status (OpenAI, ElevenLabs, Vidu) via API route — no provider HTTP calls
- Asset readiness, warnings, checklist, cost estimates, export summary
- `overallProductionScore` with quality labels

## Future

- Wire blocking warnings to job start buttons
- Historical cost tracking per storyboard revision
- Live provider health ping (optional, behind flag)
