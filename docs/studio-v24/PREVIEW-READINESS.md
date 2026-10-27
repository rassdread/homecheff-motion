# V24 isolated Preview readiness

This packet describes a new Preview. It does not deploy one.

Product commit: `5067a2b6`
Certification commit: `68d766ba`
Branch: `integrate/studio-unified-film-production`
Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`

Do not reuse certified Preview `dpl_DPE92xw7AdqMkg2E7x5MKg24A6Ft`.
Do not change Production `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` or commit `afbbd4cc5e7017ac4dce660793642b855a525ed5`.

## Database

V24 adds no Prisma migration and does not change `_prisma_migrations`.

A new Preview needs its own empty database. Apply the repository's existing migration history only to that new database, after a separate owner approval. The film timeline tables are already in this branch and are still absent from Production. That production migration remains a separate release gate.

Do not use the Production database, the certified Preview database, or any production wallet or media bucket.

## Environment names

Set these on the new Preview only. Values are not included here.

- `DATABASE_URL` for the new database
- `AUTH_SECRET`
- The Studio SSO and session variables this app already uses
- Storage variables only if the new Preview must read its own media bucket

Do not copy production provider keys. Leave these unset until a later paid-provider approval:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `VIDU_API_KEY`
- `STRIPE_SECRET_KEY`
- `BLOB_READ_WRITE_TOKEN` when the Preview must not read production media

Wallet reservation and capture stay disabled. Paid generation stays quote-only.

## Routes

- `/studio` is the unified home and project history
- `/studio/open/storyboard/:id`, `/studio/open/animation/:id`, `/studio/open/image/:id`, `/studio/open/character/:id`, `/studio/open/asset/:id`
- `/studio/projects/:id` is the workspace
- Existing editor routes stay: `/editor`, `/editor/start`, `/videos/:id`, `/studio/characters/:id`, `/studio/assets`
- `/studio?storyboardId=` opens the unified workspace. `legacy=1` still opens the previous shell

## Rollback

Do not attach the new deployment to the certified Preview alias or the production alias. If the new Preview is created later and fails acceptance, leave the alias where it is and discard that deployment. No data rollback is required for V24 because opening a project only adds a pointer row and does not rewrite the source.

## Known limitations

- Library voice, music, and sound effects are playable outputs. There is no separate generation editor for them.
- A flattened image canvas has no layers. The editor opens the stored file.
- A rendered video is not treated as an editable timeline unless a timeline record exists.
- History thumbnails use the stored preview URL. Two new lint warnings come from those `<img>` tags. Lint is otherwise 0 errors and 474 existing warnings, plus these 2.
- The previous Studio shell remains available only with `legacy=1`.

## Manual acceptance

- Sign in as a user who already has a storyboard, animation, image canvas, character, and library asset.
- Confirm all five appear under My projects.
- Open the storyboard, add a scene, refresh, leave, and open it again. The scene remains and the project id does not change.
- Open another user's id and confirm a not-found response.
- Confirm the wallet balance does not change.

## Required approval before any Preview or Production action

- Owner approval for a new Preview deployment and a new database.
- Owner approval before `prisma migrate deploy` on that new database.
- A separate approval before the production film-timeline migration.
- A separate approval before any paid provider key or wallet capture is enabled.
