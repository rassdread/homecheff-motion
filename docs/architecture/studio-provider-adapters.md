# Studio Provider Adapters (S.4)

**Status:** CANONICAL  
**ADR:** ADR-STUDIO-007

## Contract

```ts
start(input) → { providerJobId? | syncResult? }
getStatus?(providerJobId)
getResult?(providerJobId)
cancel?(providerJobId)
```

Adapters map provider status → Studio status. UI never sees raw provider enums unless diagnostics.

## Execution modes

| Mode | Use |
|------|-----|
| `sync` | OpenAI image, ElevenLabs TTS/music/SFX (current) |
| `async_poll` | Vidu motion transitions |
| `async_callback` | Export workers with signed callbacks |
| `local_process` | ffmpeg publish |

## Isolation rules

- No provider SDK imports from `"use client"` modules
- Client never sets credit cost
- Adapter id is diagnostic metadata, not user-facing product chrome (unless advanced model pick)

## Fake adapter

`createFakeProviderAdapter` supports CI harness modes: `success`, `async_success`, `failure`, `timeout`.
