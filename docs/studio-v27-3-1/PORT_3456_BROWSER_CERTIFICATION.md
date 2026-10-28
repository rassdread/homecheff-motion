# Port 3456 browser certification

The existing script `src/server/studio/studio-film-certification.browser.ts` was executed. It was not skipped and it did not pass.

## What the script requires

- `FILM_CERT_BASE_URL` must start with `https://127.0.0.1:`
- Database name must be exactly `homecheff_film_cert_2u` on `127.0.0.1`
- `STUDIO_LOCAL_MEDIA_DIR` must be set
- It creates its own `@example.test` user and signs in through the login form
- It does not start a server

The database check succeeded: `homecheff_film_cert_2u` on `127.0.0.1:5432`.

## Server attempt

Command:

`npx next dev --experimental-https -H 127.0.0.1 -p 3456`

Environment: `DATABASE_URL` pointed at `homecheff_film_cert_2u`, `STUDIO_LOCAL_MEDIA_DIR=/tmp/homecheff-film-cert-2u-media`, `STUDIO_SCENE_IMAGE_PROVIDER=mock`. Vercel, blob, and provider keys were unset. The server on port 3462 was left on `homecheff_studio_v27_2_test`.

Result:

1. `mkcert -install` failed in this non-interactive shell. Next reported `Failed to generate self-signed certificate. Falling back to http.` and printed `http://127.0.0.1:3456`.
2. Next then exited because another dev server is already running in this directory (port 3462). It told the operator to stop that process. That process was not stopped.

Nothing listened on `https://127.0.0.1:3456`.

## Script execution

```
FILM_CERT_DATABASE_URL=postgresql://sergioarrias@127.0.0.1:5432/homecheff_film_cert_2u
FILM_CERT_BASE_URL=https://127.0.0.1:3456
```

The script exited 1:

`page.goto: net::ERR_CONNECTION_REFUSED at https://127.0.0.1:3456/login`

A second constraint was not reached, and is recorded so it is not mistaken for a pass on a later retry: password login is enabled for the disposable database only when the origin is `http` and the database name is `homecheff_studio_v27_2_test`. Preview password login requires a Vercel preview deployment. Otherwise the login route returns `LEGACY_LOGIN_DISABLED`. The certification script was not modified to bypass that gate.

Verdict for this item: not passed. Blocker is local HTTPS plus the single dev-server lock, with the login gate behind it.
