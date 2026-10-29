# Production configuration audit

Read-only. No value is printed. No setting was changed.

Live project `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`.

| Name | Targets | Result |
|---|---|---|
| `HOMECHEFF_IDENTITY_ORIGIN` | production, preview | Present, sensitive, decrypt returned empty. UNVERIFIED |
| `LEGACY_STUDIO_LOGIN_ENABLED` | production, preview | Present, sensitive, decrypt returned empty. UNVERIFIED |
| `STUDIO_CENTRAL_HC_SPEND_ENABLED` | production | Present, sensitive, decrypt returned empty. UNVERIFIED |
| `VIDEO_RENDER_MODE` | preview, production | Decrypted. Value is `worker`. |
| `FFMPEG_PATH` | preview, production | Decrypted. Value is a stock `/usr` or `/usr/local` ffmpeg or ffprobe path. The isolated function does not contain those binaries. |
| `STUDIO_SCENE_IMAGE_PROVIDER` | preview only | Present. Not set on production. |
| `STUDIO_FILM_CERT_LOCAL_AUTH` | absent | Not set. |
| `STUDIO_DISPOSABLE_LOCAL_AUTH` | absent | Not set. |

The three sensitive flags stay UNVERIFIED. They are not marked PASS. Verifying them would require a decrypt that returns the value or another authorized read. This task stopped rather than copying those values into a report.

`NEXT_PUBLIC_STUDIO_URL` was not re-read in this pass. V27.4 recorded its host as `studio.homecheff.eu`. That earlier note is not treated as a new measurement.
