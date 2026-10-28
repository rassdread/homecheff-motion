# Authentication safety

Password login for `homecheff_film_cert_2u` over HTTPS was not available. The disposable gate accepts only `homecheff_studio_v27_2_test` and only an `http` origin. Preview login still requires a real Vercel preview deployment. Those gates were not widened, and `VERCEL_ENV` was not set.

A separate gate, `STUDIO_FILM_CERT_LOCAL_AUTH=true`, allows password login only when all of these hold:

- Vercel environment variables are absent.
- `DATABASE_URL` is PostgreSQL on `127.0.0.1` or `localhost`, port 5432, database name `homecheff_film_cert_2u`.
- The URL does not contain a protected host marker.
- The request `Origin` is `https`, and its host equals the `Host` header, which must be loopback.

Measured on port 3456:

| Request | Result |
| --- | --- |
| `Origin: https://127.0.0.1:3456`, unknown account | 401 `INVALID_CREDENTIALS` |
| No `Origin` | 403 `LEGACY_LOGIN_DISABLED` |
| `Origin: https://studio.homecheff.eu` | 403 `LEGACY_LOGIN_DISABLED` |

The disposable HTTP gate tests still pass, including the rejection of `homecheff_film_cert_2u`.

Session cookies stay host-only and `SameSite=Lax`. In development they are not marked `Secure`, which is the existing session helper. The browser script logged in, used the session, and after logout `GET /api/studio/projects` returned 401.

The first login click happened before React hydration. The password form had no `method`, so the browser submitted it as GET and put the credentials in the query string. The form is now `method="post"`. The script waits for the React fiber on the password field before filling it. The password is not repeated in this document.

Logout called `homecheffIdentityOrigin()` after clearing the session. With that variable unset, the route threw and returned 500, so the cleared cookie was not sent and the session remained. The route now returns a studio-only logout when the identity origin is unset. It does not call `homecheff.eu`. When the origin is set, the previous ecosystem response remains.
