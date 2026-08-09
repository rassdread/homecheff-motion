# Studio Audio — Experience Pack Readiness (S.7A)

S.6G marked Voice/Music/SFX/Publish as **ENGINE_ONLY**. This audit recommends packs **only** where runtime exists.

---

## Recommended future packs (not implementing)

| Pack | Based on | Readiness | Gaps |
|------|----------|-----------|------|
| **Voice Studio** | TTS + Character voice + preview | HIGH for Pro/Director; MEDIUM Quick | Narrator vs Character dual SoT; no Quick Experience Pack |
| **Voice Clone Studio** | Clone + consent + library | MEDIUM–HIGH | No GenerationJob; UX consent already present |
| **Music Studio** | Generate + upload + mix bed | MEDIUM | Director≠generate; stale “ships” copy; one bed only |
| **SFX Studio** | Generate + upload + bed | MEDIUM | Scene apply UI vs project bed render honesty |
| **Subtitle / Captions Studio** | STT + edit + burn-in | MEDIUM–HIGH | Fixed style; weak SRT productization; Publish STT unfinished |
| **Translate Studio** | Language export overlays | MEDIUM | Not VO/subtitle dub |
| **Dub Studio** | — | **LOW / NO** | True dubbing ABSENT |
| **Lip-Sync Studio** | — | **NO** | Amplitude mouth only |

---

## Quick Mode audio flows (current readiness)

| Consumer ask | Ready? | Inputs | Engine | Gaps |
|--------------|--------|--------|--------|------|
| Add a voice-over | PARTIAL | Script, voice profile, language | TTS job | Not Experience Pack; jargon in Director tools |
| Clone my voice | PARTIAL | Sample + consent | Clone route | Credits high (400); no Quick pack |
| Background music | PARTIAL | Prompt/mood → generate or upload | Music API + link | Funnel not consumerized |
| Add sound effects | PARTIAL | Prompt → generate | SFX API | One bed honesty |
| Create subtitles | PARTIAL | Voice/audio present | STT | Needs storyboard context |
| Translate this video | PARTIAL | Completed video | Overlay export | Not dub |

---

## Professional Mode

| Control | Available today? |
|---------|------------------|
| Voice identity / language | Yes |
| Tone / style presets | Partial (stability/similarity LIVE; emotion planning-weak) |
| Brand voice | BrandKit ID storage only |
| Music style / intensity | Yes (planning + generate separate) |
| Music/SFX volume | Via production director → static mix |
| Subtitle style | No (fixed ASS) |
| Platform | Via general Studio modes |
| Translation | Overlay export |
| Quality | Provider defaults |

---

## Director Mode

| Control | Available? |
|---------|------------|
| Per-character voices | Partial (multi-cast path) |
| Scene voice assignment | Weak |
| Timeline audio editor | No visual timeline |
| Music transitions (cues) | Planned; limited FFmpeg fades |
| SFX timing | Not rendered per scene |
| Mixing priorities | Yes → static gains |
| Multilingual tracks | Multi-lang TTS rows + overlay exports |
| Movie Builder / Production | Existing; consume handoff metadata |

---

## Matrix / Creative Director

Audio engines are Matrix-registered but **not** S.6G product packs. Creative Director does not yet open Voice/Music Quick packs. Music/Sound Directors remain specialized planners under Studio — orchestrate via handoff, do not replace.
