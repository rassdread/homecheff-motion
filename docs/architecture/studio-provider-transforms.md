# Studio Provider Transforms (S.6E)

**Last step before GenerationJob.** Transforms adapt CreativeSpecification + ContinuityBundle (or approved subset) into provider-oriented requests.

## Runtime providers (truth)

| Runtime | Transform wrapper |
|---------|-------------------|
| OpenAI image | `transforms/openai-image.ts` |
| Vidu motion | `transforms/vidu.ts` |
| ElevenLabs TTS/clone/music/sfx | `transforms/elevenlabs.ts` |
| Fusion (OpenAI image-edit path) | `transforms/fusion.ts` |
| mock | capability registry only |

**Not runtime (do not advertise):** Runway, Kling, Suno, Azure Voice, Veo.

## Boundaries

| Transform | Owns | Does not own |
|-----------|------|--------------|
| OpenAI scene still | Prompt packaging from existing builder sections | Continuity entity DB |
| Fusion | Wraps legacy Fusion prompt/payload; pixel preserve contract | Rewriting Fusion archetypes |
| Vidu | Duration/aspect/continuity case + legacy prompt wrap | Rewriting vidu-prompt-budget |
| ElevenLabs | Voice/audio field mapping | Changing ElevenLabs API |

## Continuity cases (Vidu / Instant)

- **entity_aware_studio** — approved ContinuityBundle subset attached
- **standalone_source_image** — source image is continuity; no invented entities
- **fusion_refs** — Fusion references authoritative

## Pixel honesty

Scene T2I: `pixelConditioning: partial_text_qa` — Matrix does **not** claim pixel conditioning solved. Fusion retains stronger pixel reference contract.
