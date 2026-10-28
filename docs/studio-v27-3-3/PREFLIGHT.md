# V27.3.3 preflight

Repository: `rassdread/homecheff-motion`

Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`

Branch: `integrate/studio-unified-film-production`

HEAD at start: `db3010e61ac457b4019a277afeab460f15c678af`

That matches the expected base. No reset, stash, clean, or checkout was used.

Prior local commits, still unpushed:

- V27.1 `ec5e8f828b10ed3bd311ba9145317db906280b97`
- V27.2 `d46ca5b0f4c0e489fdb19e824d088f8d7f59323e`
- V27.3 `c3353da00bdcc614c3970b2e0f696b6c486b7c78`
- V27.3.1 `cffaeb831d87038aa0bcfdde0a56f93a3a61a2ff`
- V27.3.2 `db3010e61ac457b4019a277afeab460f15c678af`

Untracked files left untouched: `.agents/`, `docs/studio-v16/`, `docs/studio-v17/`, `docs/studio-v23-10/`, `scripts/v2310-*`, `scripts/v238-auth-browser-cert.ts`, `scripts/v239-*`, `skills-lock.json`.

Listeners at start and at the end of the repair:

- `127.0.0.1:3462` node PID 61963, the existing HTTP development server. It was not stopped.
- `127.0.0.1:3456` node PID 18083, Next dev in `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v2732-https`.

The HTTPS process environment is the disposable database `homecheff_film_cert_2u` on `127.0.0.1:5432`, with `STUDIO_FILM_CERT_LOCAL_AUTH=true` and `STUDIO_SCENE_IMAGE_PROVIDER=mock`. `OPENAI_API_KEY` and `VERCEL` are unset. The certificate remains the existing self-signed file for `127.0.0.1` under `/tmp/homecheff-v2732-certs/`. It is not in the system trust store.

The HTTPS checkout does not move when the unified branch commits. The repaired route and the new server decision module were copied into that checkout, and the listening server compiled them. The browser recertification ran against that process.

Protected Neon endpoints were not used. No migration ran. No paid provider, Stripe call, push, merge, or deployment ran.
