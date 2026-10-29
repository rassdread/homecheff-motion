# Rollback

Nothing here was executed.

## Worker

Trigger: health fails, Motion routes fail auth, or the new process will not listen.

Access: Render dashboard for service `homecheff-motion`.

Target: redeploy commit `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`. Today's health body is that commit. The deployment id is UNVERIFIED, so do not roll back to a guessed id.

Expected result: `GET /health` shows that `sourceCommitSha`.

Limitation: in-flight renders on the new process are lost. Film jobs left `processing` stay in the database. The old worker does not drain them. They are not customer-visible until the new app is deployed.

## Studio

Trigger: login, billing, or Motion pages fail after the app deploy.

Access: Vercel project `homecheff-motion`.

Target: the deployment whose source commit is `afbbd4cc5e7017ac4dce660793642b855a525ed5`, after its id is read again. `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` is the last recorded id and was not reconfirmed. The Vercel token is expired.

Expected result: `studio.homecheff.eu` and `motion.homecheff.eu` serve that deployment. Film export disappears because that app has no film route.

## Database

Trigger: only if the new tables themselves are corrupt. An app or worker rollback is not that trigger.

Action: leave the three tables. The recorded live app and the live worker do not query them.

A Neon restore replaces `neondb` and discards writes after the branch. That needs a separate approval. Do not use it to undo empty tables. Do not change wallets.

## Environment

This release does not change env vars. If a later approval changes one, revert that one key to the value recorded in step 4 of the runbook.

## Storage

Leave published files in place. Do not delete customer media. A synthetic object from the approved Blob check is removed only inside that same approval.
