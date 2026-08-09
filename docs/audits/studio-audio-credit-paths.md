# Studio Audio — Technical Credit Paths (S.7A)

**Not S.8 margin audit.** Mapping only. Do not change prices.

SSOT: `src/server/studio-account/studio-action-cost-registry.ts`

---

## Paid audio actions

| actionType | Provider label | Reserved USD (entry) | Credits override | When charged | Job? |
|------------|----------------|----------------------|------------------|--------------|------|
| `voice_generation` | elevenlabs | 0.03 | derived | TTS / preview (non-cache) | TTS yes; preview no |
| `voice_clone` | elevenlabs | 1.0 | **400** hard | Clone create | No |
| `subtitle_transcription` | elevenlabs | 0.02 | derived | STT | No |
| `music_generation` | elevenlabs | 0.08 | derived | Music generate | No |
| `sfx_generation` | elevenlabs | 0.04 | derived | SFX generate | No |
| `translation_export` | openai | 0.05 | derived | Language export | No |
| `voice_suggestion` | openai | planning | derived | Assistant/planning LLM | No |
| `music_suggestion` | openai | planning | derived | Assistant/planning LLM | No |

Display prices should follow registry via existing credit UI — S.7A did not re-verify every client string.

---

## Free / skip / bypass (report only)

| Path | Behavior |
|------|----------|
| Voice preview **cache hit** | `skipCapture` / free-action registry — no wallet debit |
| Music/SFX **cache hit** | Skip capture pattern |
| Audio library **upload** / link / GET catalogs | Free |
| Subtitle CRUD (no STT) | Free |
| Orchestrator analyze-audio | Free |
| Admin bypass | `admin_bypass` reservation |
| Production chain bypass | Credit gate exception |
| Free accounts | Blocked from provider actions |
| Mock providers (no API key / env=mock) | Still generally gated by billing wrapper unless test/admin |

---

## Duplicate-charge risks

| Risk | Severity | Notes |
|------|----------|-------|
| Metering + wallet double | Low | ElevenLabs meters use `skipBillingSync: true` |
| VOICE_TTS same idempotency key | Mitigated | Job replay + chargeFinalized |
| Clone / music / SFX double-click | **Medium** | No GenerationJob idempotency |
| Multi-speaker TTS | Low | Multiple provider calls, one `voice_generation` bill |
| Handoff / render remux | Low | Mux uses existing blobs — no re-TTS charge observed |
| Language export + TTS | Separate actions | User can pay both intentionally |

---

## Failure / retry (high level)

- TTS job: failed job does not finalize charge for success path; paid regenerate needs new key
- Bare routes: depend on `runBilledProviderRoute` / reservation semantics — S.8 should deep-audit refunds
