# Studio Provider Financial Flow — Product Truth (S.8A)

**Status:** FORENSIC PRODUCT TRUTH (read-only)  
**Date:** 2026-08-09

---

## Canonical flow (when fully wired)

```
Entry route
  → (optional) createGenerationJob / resume by idempotencyKey
  → Credit authorize + reserve
  → Provider adapter execute
  → ProviderCostEvent (+ optional ProviderUsageLog)
  → Storage / output asset
  → Credit capture  OR  refund on failure / skipCapture
  → finalizeGenerationChargeOnce (if Job)
  → Result to client
```

---

## Provider inventory (implemented)

| Provider | Customer credit labels (registry) | Actual execution hubs | Metering |
|----------|-----------------------------------|----------------------|----------|
| **OpenAI** | analysis, vision, translation, fusion, many image keys | image/vision/translation/fusion libs | ProviderCostEvent + studio-cost-metering |
| **ElevenLabs** | voice_generation, voice_clone, subtitle_transcription, music, sfx | elevenlabs-* libs; voice-provider | PCE + metering; cache hits for music/SFX/preview |
| **Vidu** | motion_render | vidu.ts / vidu-motion-adapter | ProviderUsageLog + PCE; EUR video-pricing parallel |
| **Replicate** | Catalog labels character/scene/etc. | **Mainly** editor SAM3 + admin lab — **not** full Studio image pipeline | Segment routes |
| **Google Vision** | ocr alternate | google-vision-provider | Via OCR paths |
| **FFmpeg / internal** | publish_* | publish export / merge | `internal` / `internal_merge` cost actions |
| **Mock / fake** | — | fake-provider-adapter, voice mock | Dev/CI |

**Proven drift:** registry labels some image actions as `replicate`, while metering/default adapters often use **OpenAI**. Catalog ≠ execution.

---

## Future / planned adapters (not financial live)

`studio-provider-registry.ts`: Kling, Runway, Suno, Udio, Azure Voice, etc. — mostly `status: "planned"`. No live credit paths until wired.

---

## Per-provider behaviours (truth)

| Behaviour | OpenAI | ElevenLabs | Vidu | Replicate |
|-----------|--------|------------|------|-----------|
| Credit path | billProviderAction / Job | same | motion_render (+ create-time charge) | transformation_session / editor |
| Retry | new attempt = new key | same | segment retry bare billed | route-specific |
| Refund | reservation refund on fail | same | fail paths via wallet when authorized | same pattern when gated |
| Cache free | limited | music/SFX/preview yes; STT TBD | n/a | n/a |
| Job wrap | IMAGE_GENERATE, FUSION | VOICE_*, MUSIC, SFX | VIDEO track-only | no IMAGE_EDIT Job |

---

## Ownership

- **Provider adapters** own SDK calls and provider job IDs.  
- **Credits** own whether the user pays.  
- **Billing** owns Stripe money-in.  
- **Telemetry** owns COGS rows.
