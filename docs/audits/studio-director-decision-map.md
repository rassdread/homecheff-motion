# Studio Director Decision Map (S.6F)

**Date:** 2026-08-09  
**Rule:** Nothing may have multiple owners. Directors propose; Continuity persists identity; Matrix assembles; Transform adapts; Provider executes.

---

## Ownership matrix

| Decision | User | Director (orchestrator + domain planners) | Continuity | Prompt Matrix | Provider Transform | Provider |
|----------|:----:|:-----------------------------------------:|:----------:|:-------------:|:------------------:|:--------:|
| Attach Character/Location/Prop/World | ✓ | may propose attach | **owns** | Identity modules | preserve IDs/refs | consumes |
| Identity memory / refs / voice lock | ✓ edit | — | **owns** | Assembles | must not invent | optional native cache |
| Shot type | ✓ | ✓ Auto Shot / Scene Director | Scene field persist | composition module | phrases only | prompt-only (stills) |
| Camera movement | ✓ | ✓ | Scene | camera module | — | — |
| Scene energy / pace | ✓ | ✓ + energy curve | Scene | movement module | — | Motion interprets |
| Action / emotion | ✓ | ✓ propose | Scene | performance | — | — |
| Director profile | ✓ | ✓ interpreter/wizard | Storyboard | style/director lines | — | — |
| Style profile | ✓ | ✓ | Storyboard + World style | visual.style | — | Instant has parallel styles |
| Lighting | ✓ (limited UI) | Weak/Partial planners | — | lighting field | — | — |
| Duration | ✓ override | Quick/intent defaults | Scene duration | **resolveDuration** | clamp | Vidu length |
| Aspect | ✓ Instant; Studio weak UI | platform defaults | — | **resolveAspect** | constraints | runtime |
| Music | ✓ | Music Director | World ambience partial | audio module | ElevenLabs map | ElevenLabs |
| Sound / SFX | ✓ | Sound Director | — | audio | ElevenLabs | ElevenLabs |
| Voice script / narration | ✓ | Voice Director | Character voice identity | voice module | ElevenLabs | ElevenLabs |
| Provider selection | implicit | assignment/execution directors (plan) | — | neutral hints | syntax | OpenAI/Vidu/EL runtime |
| Quality instructions | rare | policy | — | quality module | — | — |
| Negatives / safety | rare | policy | — | negatives | provider negatives | Vidu/Fusion |
| Brand | ✓ link kit | — | Brand slot | optional overlay | — | unwired gen |
| PromptPreset | ✓ | — | — | creative overlay only | — | — |
| Experience / mode | entry path | Quick/Pro/Director policy | same bundle | registry + detailLevel | — | — |
| Render / publish plan | ✓ | Production/Movie planners | — | — | — | jobs/export |
| Fusion preserve | ✓ refs | Fusion planner/parser | refs subset | intent only | **Fusion transform** | OpenAI edit |
| Motion source still | ✓ / handoff | Animation/Vidu planners | approved subset | — | Vidu transform | Vidu |

---

## Automatic creative decisions (ranked)

### Strong
- Shot / movement / energy via scene enums + auto-shot arc mapping  
- Director + style profile phrase injection  
- Scene still Continuity → Matrix → builder sections (S.6E wrapped)  
- Fusion intelligence preserve for LIVE intents  
- Character voice identity resolve + lock  
- Storyboard→Motion handoff source stills  

### Partial
- AI Director free-text interpreter  
- V11 wizard defaults  
- Music/sound plans → actual audio generate  
- Duration (multiple SoTs; Matrix precedence exists)  
- Aspect (Studio UI weak; product default 9:16)  
- Provider assignment (plan ≠ runtime)  
- Composition / blocking / attention directors  
- BrandKit / PromptPreset into generation  

### Weak
- Lighting as first-class automatic decision  
- Brand-aware creative direction  
- Unified “one Director” entry  
- Cross-experience learning applied automatically  

### Missing
- Product-level Quick/Professional/Director **mode controller**  
- Single orchestration facade over domain directors  
- Guaranteed ContinuityBundle on all Instant/Motion Quick doors  
- Pixel conditioning for scene T2I (still PARTIAL — not a Director gap alone)

---

## Duplicate systems (document only)

| Concern | Parallel systems |
|---------|------------------|
| Camera | Scene director enums · legacy camera builder · Matrix maps · Director V2 subset · Instant premium camera · Motion action presets |
| Duration | Scene · Matrix resolve · brief/V11 chips · long-form · intent defaults · Motion 5/8/12 |
| Quality | Hardcoded QUALITY_INSTRUCTIONS · Matrix quality · provider cost/quality plans · prompt quality score · movie director quality |
| Providers | Runtime OpenAI/Vidu/EL · planning assignment (runway/suno names) · Matrix capability registry · transforms wrap |
| Music | Music director · audio production · ElevenLabs generate · Instant overlays · assistant prepare_music |
| Voice | Character voice Continuity · voice director · voice identity director · profiles/marketplace · Matrix mapping |
| Director | Profiles · V2 panel · Classic AI Director · proposal pipeline · domain directors · assistants |
| Style | Style profiles · World visualStyle · Instant styles · STYLE_PROMPTS · Style DNA |
| Assistant | Creation Assistant · Homecheff/Growth routers · Publish assistant · on-demand AI sheet |

**S.6F must orchestrate, not add another parallel SoT.**
