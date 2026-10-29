# Environment readiness

The Vercel project API returned HTTP 403. No value was decrypted in this pass.

| Name | This pass | Prior evidence |
|---|---|---|
| `HOMECHEFF_IDENTITY_ORIGIN` | UNVERIFIED | V27.5: present, sensitive, decrypt empty |
| `LEGACY_STUDIO_LOGIN_ENABLED` | UNVERIFIED | V27.5: present, sensitive, decrypt empty |
| `STUDIO_CENTRAL_HC_SPEND_ENABLED` | UNVERIFIED | V27.5: present, sensitive, decrypt empty |
| `VIDEO_RENDER_MODE` | UNVERIFIED this pass | V27.5: `worker` on preview and production |
| `VIDEO_WORKER_BASE_URL` | UNVERIFIED this pass | V27.5: host `homecheff-motion.onrender.com` |
| `VIDEO_WORKER_SECRET` | UNVERIFIED | V27.5: set, value not recorded |
| `FFMPEG_PATH` on Vercel | UNVERIFIED this pass | V27.5: a stock `/usr` path. The Vercel function probe found no binary there |
| `FFMPEG_PATH` on the live worker | VERIFIED by health as `/usr/bin/ffmpeg` | Matches `Dockerfile.worker` |
| Blob token | UNVERIFIED this pass | V27.4: present on production. Not used |
| `DATABASE_URL` | UNVERIFIED this pass | Not read |

Prior rows are HISTORICALLY_REPORTED. They are not a new pass. None of these settings were changed.
