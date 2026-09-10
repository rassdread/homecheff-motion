# Scenario A — Rode Loper Final Closeout

## Verdict: **WORKING** (merge repair required)

## Auth

- Pre-grant: 403 `free_account_provider_action` (see `CERT-ACCOUNT-PREACCESS-403.json`)
- Post-grant: `POST /api/instant-premium/create-and-generate` → **200**
- Project: `cmt5hnj1s0003jh09hns3vu4v`

## Vidu / motion

- Real provider motion segment completed (`segment-1.mp4` on blob storage)
- Credits: motion_render tier (~450)
- Human visual (frame `rode-loper-frame-t1.jpg`): stylized 3D red-carpet character with HomeCheff branding — **PASS** usability; identity vs photo reference is **WARN** (preset stylization, not photoreal)

## Final merge

- Initial poll stuck: `finalizing` / `merging_clips` / 70% for ~30+ minutes (`isRestoringFinalVideo: true`)
- `POST rebuild-final-video` → **200**, `final-v1.mp4` produced
- Classification: **P1 operational** — merge worker/repair path required manual rebuild

## Continue in Studio

- `POST preset-materialize` (`MOTION_PRESET` / `red_carpet_moment`) → storyboard `cmt5iy6tq0001l7048cl7cnvv`
- Second materialize: **reused** same id (idempotent)
- Finish stage reachable; Projects API shows Rode loper cert card(s)

## Provider trace (sanitized)

| Provider | Calls | Notes |
|----------|-------|-------|
| OpenAI image | 0 in A path | Person thumb from upload API |
| Vidu | 1 motion | Segment completed |
| ElevenLabs | 0 | — |
| Credits | ~450–900 promotional | See billing audit |

## Classifications

| Gate | Status |
|------|--------|
| RODE_LOPER | WORKING |
| RODE_LOPER_VIDU | WORKING |
| PRESET_CONTINUE | CERTIFIED |
