# Authentication audit

`src/server/auth/session.ts` is unchanged between the live commit and the candidate. Cookie construction was not modified.

`STUDIO_FILM_CERT_LOCAL_AUTH` is absent from the Vercel project environment, including production and preview. `STUDIO_DISPOSABLE_LOCAL_AUTH` is also absent.

`isFilmCertLocalBrowserRequest` requires the flag, a non-Vercel process, database `homecheff_film_cert_2u` on `127.0.0.1` or `localhost:5432`, an `https` Origin that matches the Host header, and a loopback host. Production always sets `VERCEL`, so `filmCertLocalDatabaseReason` returns `vercel_environment` even if the flag were added later. A browser body cannot turn the gate on. Unit tests reject `studio.homecheff.eu`, the protected Neon host, and `VERCEL_ENV=preview`.

`STUDIO_PREVIEW_LOCAL_LOGIN=true` exists only on the preview target. Preview password login also requires `VERCEL_ENV=preview` and project id `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`. Production `VERCEL_ENV` is not preview, so that login does not apply to the live domain.

Logout in the candidate calls the identity origin only when `HOMECHEFF_IDENTITY_ORIGIN` is non-empty and the scope is ecosystem. `resolveStudioLogoutScope` forces `studio_only` only when preview-local password login is active. Otherwise an ecosystem request stays ecosystem. The client calls production identity logout at `https://homecheff.eu/api/auth/ecosystem-logout` only when the deployment is not preview-isolated and the server did not return `studio_only`.

`HOMECHEFF_IDENTITY_ORIGIN` and `LEGACY_STUDIO_LOGIN_ENABLED` exist on production as sensitive variables. The API did not decrypt them (`decrypted=false`). Their values are unverified. The code path preserves ecosystem logout whenever the origin value is non-empty. No live session was changed and no user was logged out.
