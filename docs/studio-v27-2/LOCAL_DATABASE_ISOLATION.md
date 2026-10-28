# Local database isolation

Disposable database:

`postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test`

| Check | Evidence |
| --- | --- |
| Server | Homebrew PostgreSQL 16.15, data directory `/opt/homebrew/var/postgresql@16` |
| Listen | `localhost`, port 5432. TCP check returned `127.0.0.1/32` |
| Name | `homecheff_studio_v27_2_test` |
| User | `sergioarrias` |
| Before migrate | public schema had 0 tables |
| Migrate | `npx prisma migrate deploy` applied the existing 80 migrations |
| Prisma confirmation | PostgreSQL database `homecheff_studio_v27_2_test`, schema `public`, host `127.0.0.1:5432` |
| Protected hosts | none in the connection string |

The connection is refused by `disposableLocalDatabaseReason` unless the host is `127.0.0.1` or `localhost`, the port is empty or 5432, and the database name is exactly `homecheff_studio_v27_2_test`. `VERCEL`, `VERCEL_ENV`, and `VERCEL_URL` must be unset. Blocked markers include `neon.tech`, `ep-wild-morning`, `ep-purple-moon`, `ep-withered-moon`, `homecheff.eu`, `amazonaws.com`, and `vercel-storage.com`.

Docker is not installed. No cloud database was created. Other local certification databases on the same server were not used.

A migration seed user `legacy-owner@homecheff.local` exists in this database and was not used. Synthetic users were inserted only by `scripts/v272-seed-local-users.ts`, which refuses any other database URL.
