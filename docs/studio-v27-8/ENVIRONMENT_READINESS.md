# Environment readiness

One Vercel project read was attempted for `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`. The API returned HTTP 403. It was not retried.

UNVERIFIED this pass:

- `HOMECHEFF_IDENTITY_ORIGIN`
- `LEGACY_STUDIO_LOGIN_ENABLED`
- `STUDIO_CENTRAL_HC_SPEND_ENABLED`
- `VIDEO_WORKER_SECRET` consistency between Vercel and Render
- The configured worker URL value

VERIFIED this pass, read only:

- Live worker `GET /health` HTTP 200, commit `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`
- Live `GET /health/video` reports `/usr/bin/ffmpeg`

HISTORICALLY_REPORTED from V27.5, not decrypted again: production `VIDEO_RENDER_MODE=worker` and the worker host `homecheff-motion.onrender.com`. Do not treat that as a new read.

No environment was changed.
