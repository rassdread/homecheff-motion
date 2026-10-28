# Original 60 HC evidence

Database: local `homecheff_film_cert_2u` on `127.0.0.1:5432`.

These rows were read and left in place. The wallet was not restored.

Synthetic user: `cmvse60hg0000dh8v0j00a2g1`

Email: `film-browser-1793208710593@example.test`

Wallet: `cmvse60ig0004dh8v563nwtww`

Balance after the V27.3.2 browser run: 440 HC

Lifetime spent: 60 HC

Reserved balance: 0

Browser project: `cmvse62gr0022dhybadrgb82h`

Ledger project id (storyboard passed into billing): `cmvse62gv0024dhyb2a21tlem`

Scene images, both `provider = mock`, `status = completed`:

| Image | Scene | Created |
| --- | --- | --- |
| `cmvse653l002idhybeaaefcqi` | `cmvse62up0028dhybnhfx04fa` | 2026-10-28 17:31:56.625 |
| `cmvse657f002ydhybf6s2kcll` | `cmvse62ox0026dhyb4trdmd22` | 2026-10-28 17:31:56.764 |

Ledger rows for that user. There are no refund rows.

| Ledger id | Action | Delta | Balance after | Provider | Created |
| --- | --- | --- | --- | --- | --- |
| `cmvse6539002gdhybqevb0sid` | `usage_reservation` | 0 | 500 | openai | 2026-10-28 17:31:56.613 |
| `cmvse6557002mdhybwl1netl5` | `usage_capture` | -30 | 470 | openai | 2026-10-28 17:31:56.683 |
| `cmvse657b002wdhybnmq9nt27` | `usage_reservation` | 0 | 470 | openai | 2026-10-28 17:31:56.759 |
| `cmvse658f0032dhybtkee8ebk` | `usage_capture` | -30 | 440 | openai | 2026-10-28 17:31:56.799 |

Reservation metadata: `{"actionType":"scene_generation","reservedCredits":30}`.

First capture metadata includes reservation `cmvse6539002gdhybqevb0sid`, `studioActionType = scene_generation`, `spentFromPromotional = 30`, `providerCostEventId = cmvse654y002kdhybbhtuiio4`.

Second capture metadata includes reservation `cmvse657b002wdhybnmq9nt27`, `spentFromPromotional = 30`, `providerCostEventId = cmvse65860030dhyb4i6aqx78`.

Starting balance 500, ending balance 440, two captures, 30 HC each, 60 HC total. The stored images say `mock`. The ledger says `openai`.

After this repair the same wallet was read again: balance 440, lifetime spent 60, reserved 0. The four ledger rows are still present.
