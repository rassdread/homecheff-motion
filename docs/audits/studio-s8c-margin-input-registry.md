# S.8C — Margin Input Registry

Canonical rows: `src/lib/studio-s8c-margin-input-registry.ts`

No margin math in S.8B. Input for **S.8C — Provider Cost & Margin Audit**.

## Entry condition from S.8B (2026-08-09)

S.8B Preview TEST financial certification is GREEN for Auto Top-Up payment/grant/replay and GenerationJob wraps for STT/Translate (mock/user_reviewed paths).

S.8C may start after PR #16 merge + Production LIVE non-spend smoke.

Non-blocking for S.8C start:

- ElevenLabs Preview key missing `speech_to_text` permission (fix STT provider permission separately)
- Shared Neon Preview/Production
- Temporary Stripe TEST sandbox claim/expiry

## S.8C completion (2026-08-09)

Margin math and commercial model are documented (read-only). See:

- `docs/audits/studio-s8c-final-report.md`
- `docs/architecture/studio-provider-margin-model.md`
- `docs/architecture/studio-commercial-model.md`
- `docs/architecture/studio-financial-profit-model.md`
