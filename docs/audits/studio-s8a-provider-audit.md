# S.8A — Provider Audit

**Date:** 2026-08-09 · **Read-only**

## Live providers

| Provider | Billing path | Pricing registry | Execution | Telemetry | Retry | Refund | Cache |
|----------|--------------|------------------|-----------|-----------|-------|--------|-------|
| OpenAI | Credits via action types | registry + cost mapping | image/vision/translate/fusion | PCE + metering | new key / route | reservation refund | limited |
| ElevenLabs | Credits | registry | TTS/clone/STT/music/SFX | PCE + metering | same | same | music/SFX/preview |
| Vidu | `motion_render` + optional EUR quote | registry + video-pricing | motion adapter | PCE + ProviderUsageLog | segment retry billed | wallet when authorized | n/a |
| Replicate | editor segment / lab | registry labels drift | SAM3 editor | route-gated | route | wallet when gated | n/a |
| Google Vision | OCR alternate | ocr_scan | vision provider | via OCR | — | — | — |
| FFmpeg | publish_* | registry | export/merge | internal cost | — | — | — |

## Planned (not live financial)

Kling, Runway, Suno, Udio, Azure Voice, Artlist, Freesound — registry metadata only.

## Honest mismatches

- Registry “replicate” for many Studio image actions vs OpenAI execution/metering  
- Suggestions (`voice_suggestion`, `music_suggestion`) priced in registry; clear billed route wiring weak/absent in audit pass  
- STT / translate: provider live + credits live + **GenerationJob deferred**

## Status

**PASS as Product Truth** — no implementation.
