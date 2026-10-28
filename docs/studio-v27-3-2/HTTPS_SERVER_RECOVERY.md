# HTTPS server recovery

The V27.3.1 attempt failed for two stacked reasons.

1. `next dev --experimental-https` ran `mkcert -install`, which needs an interactive password. This shell has no `mkcert` on `PATH`. Next then fell back to HTTP.
2. Next then exited because another `next dev` already held `.next-dev/lock` in this worktree. That lock belongs to the server on port 3462. The lock path is `distDir/lock`, and development `distDir` is `.next-dev`.

A second `next dev` in the same directory cannot start while 3462 is running. `next.config.ts` was not changed, so the live server was not restarted.

## Isolated directory

A detached git worktree was added at the same commit:

`/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v2732-https`

`node_modules` was first a symlink to the unified worktree. Turbopack refused it: the symlink points outside the project root. Webpack (`next dev --webpack`) started, then failed to compile `node:crypto`. The symlink was replaced with an APFS clone of `node_modules` inside the worktree. Turbopack then started and served the app.

The worktree has its own `.next-dev`. Port 3462 kept the original lock.

Changed source files were copied into that worktree so the HTTPS process served the same code that is committed from the unified worktree. The worktree is not the commit target.

## Startup that stayed up

Working directory: the isolated worktree.

```text
env -u VERCEL -u VERCEL_ENV -u VERCEL_URL -u VERCEL_PROJECT_ID \
  -u BLOB_READ_WRITE_TOKEN -u OPENAI_API_KEY -u ELEVENLABS_API_KEY \
  -u STRIPE_SECRET_KEY -u STRIPE_WEBHOOK_SECRET -u ANTHROPIC_API_KEY \
  -u REPLICATE_API_TOKEN -u STUDIO_DISPOSABLE_LOCAL_AUTH \
  -u STUDIO_PREVIEW_LOCAL_LOGIN \
  DATABASE_URL=postgresql://sergioarrias@127.0.0.1:5432/homecheff_film_cert_2u \
  STUDIO_FILM_CERT_LOCAL_AUTH=true \
  STUDIO_LOCAL_MEDIA_DIR=$TMPDIR/homecheff-v2732-media \
  STUDIO_SCENE_IMAGE_LOCAL_DIR=$TMPDIR/homecheff-v2732-scene-images \
  STUDIO_SCENE_IMAGE_PROVIDER=mock \
  BLOB_READ_WRITE_TOKEN= \
  npx next dev --experimental-https \
    --experimental-https-key /tmp/homecheff-v2732-certs/127.0.0.1-key.pem \
    --experimental-https-cert /tmp/homecheff-v2732-certs/127.0.0.1.pem \
    -H 127.0.0.1 -p 3456
```

`$TMPDIR` on this machine is `/var/folders/dr/r146hbbd7fld0ld1txvtrl7c0000gn/T`. Scene images are accepted only under that directory.

Listening process: node PID 18083 on `127.0.0.1:3456`.

`GET https://127.0.0.1:3456/login` returned 200. `GET http://127.0.0.1:3462/login` still returned 200.
