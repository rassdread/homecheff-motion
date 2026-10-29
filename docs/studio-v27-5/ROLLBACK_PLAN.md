# Rollback plan

Not executed.

## Application

The current live deployment is `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`, commit `afbbd4cc5e7017ac4dce660793642b855a525ed5`, region `fra1`.

Rollback is a redeploy of that deployment, or whichever deployment is live at approval time. Confirm the id immediately before the release. Both `studio.homecheff.eu` and `motion.homecheff.eu` follow that deployment. Do not change aliases onto a different project.

Redeploying the previous build does not drop database tables.

## Database

If the timeline migration has been applied, leave the three new tables during application rollback. The previous application does not read them. Dropping them is not the rollback.

If the data itself must return to the pre-migration moment, restore the Neon branch taken in the backup plan. That is a separate approval. It discards later writes. This task did not create that branch, so there is no restore point from V27.5.

## This candidate

`8ffde5d7` is local only. Nothing to roll back in production. If it were deployed and export returned 503, the rollback is the previous deployment above. Local certification servers on 3458 were already stopped.
