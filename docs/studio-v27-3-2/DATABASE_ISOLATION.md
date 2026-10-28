# Database isolation

The browser script requires the database name `homecheff_film_cert_2u` on host `127.0.0.1`. That database answered on port 5432.

The HTTPS server's `DATABASE_URL` uses that name, host, and port. Login returned invalid credentials for an unknown local account, which the film-cert gate only does when that database name matches. A different database name would have returned `LEGACY_LOGIN_DISABLED`.

`homecheff_studio_v27_2_test` stayed on the server at port 3462. Its wallets were read after the browser run:

| Account | Balance | Lifetime spent |
| --- | ---: | ---: |
| v272-user-a | 500 | 0 |
| v272-user-b | 100 | 0 |
| v272-user-c | 0 | 0 |

No connection string in this task contained `ep-wild-morning`, `ep-purple-moon`, `ep-withered-moon`, `neon.tech`, or `homecheff.eu`. No database was deleted. No migration was run.

The browser script creates its own `@example.test` user in `homecheff_film_cert_2u`. Those rows were left in place.
