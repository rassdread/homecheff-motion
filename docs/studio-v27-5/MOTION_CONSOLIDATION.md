# Motion consolidation

Motion stays inside Studio. This task did not delete Motion code, Motion projects, or Motion media. No production row was updated. No domain redirect was activated.

## Still present

- `/motion` and `/motion/start`
- `/editor/start`
- `/studio/quick-ad`
- `/studio/audio/create`
- `/studio/experience`

Photo animation create still charges `motion_render`. The job start route does not charge again. Those pages were not rebuilt.

V27.4 compared the wizards with live commit `afbbd4cc`: the Motion, editor, quick-ad, and experience pages were unchanged, return links were added, and `/studio/audio/create` is new. This task did not edit those pages.

Existing Motion projects remain in `AnimationProject`. Production row counts were not modified. This rehearsal did not migrate or rewrite them.

## Future redirect, not active

When Studio is certified and a separate approval allows the domain change, redirect the host only:

`https://motion.homecheff.eu<path>?<query>` to `https://studio.homecheff.eu<path>?<query>`

Examples that must keep their path: `/motion`, `/editor/start`, `/projects/<id>`, `/videos/<id>`. Do not send every deep link to the homepage.

Do not put that redirect in `next.config.ts` before the unified release. A later deploy would turn it on. Both domains currently serve the same deployment, so the redirect is not required for the application to answer.

`MOTION_REDIRECT_PREPARED` = documented. `MOTION_REDIRECT_ACTIVATED` = no.
