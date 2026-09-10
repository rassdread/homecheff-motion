# Provider Calls — Authenticated Production Closeout

**Date:** 2026-08-22  

## Budget caps (per spec)

| Provider | Cap |
|----------|----:|
| OpenAI image | 12 |
| OpenAI vision | 4 |
| Vidu | 2 |
| ElevenLabs | 6 |
| Music | 2 |
| SFX | 4 |
| Final render | 2 |

## Actual (this slice — Production API)

| Scenario | OpenAI | Vidu | ElevenLabs | Music | SFX | Render |
|----------|-------:|-----:|-----------:|------:|----:|-------:|
| A Rode loper | 0 | 0 | 0 | 0 | 0 | 0 |
| C Pixar | 0 | 0 | 0 | 0 | 0 | 0 |
| G HomeCheff (px4a5) | 0 | 0 | 0 | 0 | 0 | 0 |
| Prior provider-visual (local OpenAI) | 8 | 0 | 0 | 0 | 0 | 0 |

**Delta reason:** Production `403 free_account_provider_action` stopped all paid provider calls before execution.

## Billing safety

- No duplicate debit (no successful provider reservations)  
- FREE_LOCAL Quick Video paths: 0 provider credits (px4a5 PASS)  
- Upload API: 200 (storage only, no generation debit)

## Approximate spend

| Provider | USD (est.) |
|----------|----------:|
| Production this slice | $0.00 |
| Prior closeout OpenAI probes | ~$0.15–0.40 |
