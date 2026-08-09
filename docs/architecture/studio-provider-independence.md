# Studio Provider Independence (S.6C)

**Status:** Continuity must survive provider changes  
**Rule:** Memory and identity live above adapters.

---

## 1. Principle

```
ContinuityBundle  (provider-agnostic)
        ↓
Prompt Matrix     (provider-agnostic modules)
        ↓
Provider Transform (provider-specific)
        ↓
OpenAI | Vidu | Kling | Runway | Veo | ElevenLabs | …
```

Replacing a provider **must not** require rebuilding Character/Location/Prop/World/Brand memory.

---

## 2. What is provider-independent (frozen)

| Artifact | Independent |
|----------|-------------|
| Prisma entity fields (memory, strengths, clothing, …) | **Yes** |
| Reference asset URLs / storage keys / roles | **Yes** |
| ContinuityBundle schema | **Yes** |
| Matrix Identity/Story/Director/Camera modules (semantic) | **Yes** |
| Scene link graph | **Yes** |
| Voice identity fields (speaker intent) | **Yes** (mapping to voice_id is transform) |

---

## 3. What is provider-specific (allowed only in Transform)

| Concern | Layer |
|---------|-------|
| Prompt length budgets / block order | Transform (e.g. Vidu budget) |
| Negative prompt syntax | Transform |
| Native reference-image / image-edit APIs | Transform |
| Model ids, seeds, sampler params | Transform / adapter |
| TTS voice_id mapping | Voice adapter |
| Async poll vs sync | Generation adapter (S.4) |

---

## 4. Provider matrix (continuity survival)

| Provider | Used today | Continuity survival requirement |
|----------|------------|----------------------------------|
| OpenAI Images | Scene T2I, Fusion | Accept Identity modules + optional future image refs |
| OpenAI Vision | QA | May consume ReferenceDescriptors |
| Vidu | I2V Motion | Preserve still content + motion instructions from Continuity-aware handoff |
| ElevenLabs | Voice/music/sfx/STT | Map VoiceIdentity → provider voice; do not store memory only as voice_id |
| Kling / Runway / Veo | Future / plan ids | **New Transform only** — ContinuityBundle unchanged |
| Mock | Cert | Same ContinuityBundle |

---

## 5. Anti-patterns (forbidden)

1. Storing “the OpenAI prompt” as the only Character SoT.  
2. Embedding provider-only tokens in `appearanceMemory` as the sole identity.  
3. Deleting Continuity fields because a new video model “doesn’t need them.”  
4. Planning registry IDs (`suno`, `runway`) implying Continuity lives in that vendor.

---

## 6. Verification statement (S.6C)

**Verified by architecture:** Continuity data model is already provider-agnostic (Postgres + blob URLs).  
**Gap:** Runtime scene T2I does not yet pass reference pixels — that is a Transform capability gap, **not** a reason to couple memory to OpenAI.

**Conclusion:** Provider independence of Continuity is **architecturally satisfied** for S.6C freeze; future providers attach via Transform only.
