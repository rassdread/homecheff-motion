# Rollback plan

Rollback target:

- deployment `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`
- commit `afbbd4cc5e7017ac4dce660793642b855a525ed5`
- branch `feature/passion-character-masters-production`
- aliases `studio.homecheff.eu` and `motion.homecheff.eu` together

Procedure, not executed:

1. In the Vercel project `homecheff-motion`, assign production aliases back to `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`.
2. Do not change environment variables during the rollback.
3. Do not restore the database over the top of current data.
4. If `20261020120000_studio_timeline` has been applied, leave the three new tables. The previous application does not query them. Customer projects, wallets, and media stay.
5. Confirm `/`, `/login`, `/motion`, and `/editor/start` return 200, and an existing animation project still opens.
6. Confirm a known wallet balance matches the pre-release note taken by the operator. This audit did not snapshot individual balances.

Instant rollback is true for the application alias. It is not a database rewind. It does not delete media created after the release. If a generation captured credits, the ledger row remains; reversing a customer charge is a separate billing action and was not designed here.

A backup of `neondb` on `ep-wild-morning-alynrf2i` is required before the migration. This task did not create that backup and does not include Neon credentials in the repo.
