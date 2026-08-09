# Studio Prompt Coverage Audit (S.6D)

**Rule:** Do not rewrite prompts. Classify wiring of selections → generation.  
**Cross-ref:** `studio-option-prompt-traceability.md` (S.6B) for option-level detail.

---

## 1. Coverage by selection class

| Selection class | Scene stills | Instant/Motion | Fusion | Voice/Audio | Class |
|-----------------|--------------|----------------|--------|-------------|-------|
| Character / Location / Props / World | Text modules if linked | Weak (baked into still) | Preserve rules / refs | Voice on character | PARTIALLY_WIRED |
| Brand Kit (Prisma) | No | No | No (other brand rules) | No | UI_ONLY / storage |
| Style / director profile | Yes | Separate Instant styles | Archetype style | Music/sound profiles | PARTIALLY_WIRED (parallel) |
| Shot / movement / energy | Yes (phrases) | Motion instructions / chips | Limited | — | FULLY_WIRED (stills); PARTIAL (video) |
| Action / emotion | Yes | Instant emotion overlays | Intent-specific | — | FULLY_WIRED / PARTIAL |
| Lighting | Via location/world fields | Chips/styles | Intent lighting | — | PARTIALLY_WIRED |
| Lens | No dedicated Studio control | — | — | — | UNKNOWN / missing |
| Duration | Scene timing | Instant/Vidu duration | N/A image | Audio plans | PARTIALLY_WIRED (drift) |
| Aspect | Forced 9:16 handoff | Instant picker | Image size | — | PARTIALLY_WIRED |
| Platform (TikTok/IG) | Phrase/intent only | Presets/social | Social intents | — | PARTIALLY_WIRED |
| Audience | Brief suggestions | — | — | — | PARTIALLY_WIRED |
| Negative prompt | Quality string / Vidu negatives | Preset negatives | Archetype negatives | — | PARTIALLY_WIRED |
| Quality | Hardcoded + plan profiles | Instant polish | Credits tiers | — | PARTIALLY_WIRED |
| Provider choice | Plan ≠ always runtime | Vidu fixed | OpenAI fixed | ElevenLabs | PARTIALLY_WIRED |
| Music / SFX style | Directors → gen prompt | Instant audio | — | Direct prompts | PARTIALLY_WIRED |
| Voice | Not in stills | Handoff | — | TTS params | PARTIALLY_WIRED |
| Prompt Preset DB | No | No | No | No | UI_ONLY |

---

## 2. Experience-level prompt quality (no rewrites)

| Experience band | Generic? | Optimized? | Ignores selections? | Ignores continuity? | Ignores provider? | Score |
|-----------------|----------|------------|---------------------|---------------------|------------------|-------|
| Scene stills + prompt builder | No | Sectioned | Sometimes (empty links) | Partial (text only) | Mostly generic OpenAI | **B** |
| Improve / corrections | Heuristic | Patches | Partial | Drift-aware | Generic | **C+** |
| Asset reference wizards | Kind-specific | Boosts | Chip-dependent | Identity locks partial | OpenAI | **B-** |
| Fusion intelligence | Intent-specific | Archetypes + preserve | Role-dependent | Partial (refs) | OpenAI-specific | **B+** |
| Fusion advanced/sim | Varies | Simulation disclaimers | High risk | Weak | OpenAI | **C** |
| Instant styles/chips | Style maps | Vidu-oriented | Some chips soft | Weak library Cont. | Vidu transform | **B** |
| Motion presets (65) | Template prompts | Per-preset | User options limited | Prefers motion-ready | Vidu | **B** |
| Video intents (15) | Director defaults | Duration/profile map | No full prompt until scenes | Until attach | Plan only | **C+** (planning) |
| Voice TTS | Script-driven | Voice profiles | N/A image opts | Character voice partial | ElevenLabs | **B** |
| Music/SFX | Thin text | Director plan | Many UI tags unused | No | ElevenLabs | **C** |
| Publish modes | Template | Light | Many | No | Mixed | **C** |
| SEO use-case pages | N/A | N/A | N/A | N/A | N/A | **N/A** (marketing) |

---

## 3. Prompt Matrix readiness per band

| Band | Readiness |
|------|-----------|
| Scene stills | **Ready** (wrap ContinuityBundle + sections) |
| Identity asset gen | **Needs Mapping** + Continuity |
| Fusion intents | **Needs Mapping** + Provider Transform + Continuity subset |
| Instant / Motion presets | **Needs Mapping** + Continuity + Vidu Transform |
| Video intents | **Needs Continuity** (ensure attach) + Mapping |
| Voice/Music/SFX | **Needs Mapping** (settings matrix) |
| Brand/Presets storage | **Needs Product Decision** (wire vs keep storage) |
| Simulations / legacy | **Needs Product Decision** |

---

## 4. Bypass findings (ownership)

Experiences that **do not** pass a formal ContinuityBundle today:

- Instant Premium / Motion presets (unless stills already contain identity)  
- Many Fusion paths (use local preserve + refs)  
- Music/SFX/Subtitles/Translate/Publish  
- SEO marketing CTAs  

**S.6C law:** these must be brought into ContinuityBundle (or documented Continuity subset) before claiming Matrix compliance. S.6D records the gap; does not implement.
