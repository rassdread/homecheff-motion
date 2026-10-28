# GO / NO-GO

Verdict: `NO_GO_WITH_BLOCKERS`

The candidate commit was reproduced from a clean checkout and the local HTTPS certification passed with wallet delta 0. The live deployment is identified. The database gap is one additive timeline migration. Billing prices are unchanged, and the mock free path cannot be opened by a production request.

Release is blocked because the new film MP4 route has no `maxDuration`, `vercel.json` does not set a function limit, and the successful export used local Homebrew FFmpeg. Production `FFMPEG_PATH` and the blob token are configured, and older render routes already set 60 to 300 seconds, but this route was not run on Vercel. The task requires that unproven production rendering be a NO-GO.

Also unresolved before a later GO:

- Apply `20261020120000_studio_timeline` only after a backup and a separate approval. Film timeline persistence does not work on the current production schema.
- Read, in the Vercel UI, `HOMECHEFF_IDENTITY_ORIGIN`, `LEGACY_STUDIO_LOGIN_ENABLED`, and `STUDIO_CENTRAL_HC_SPEND_ENABLED`. The API did not decrypt them.
- Remember that `studio.homecheff.eu` and `motion.homecheff.eu` are the same deployment.
- Rebuild on Node 24.x, which is the project setting. This audit built on Node v25.6.1.

No production data was changed. No deployment was created. No alias was moved. Nothing was pushed or merged.

The practical test on the live domain stays waiting on a later, explicit release approval.
