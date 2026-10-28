# Live versus candidate

Live: `afbbd4cc5e7017ac4dce660793642b855a525ed5`

Candidate: `dcd0caea75b6d08755c4431ceebc3eba651f10b7`

`git merge-base` is the live commit. The candidate is 36 commits ahead. Diff stat: 351 files, 28037 insertions, 502 deletions. Next.js stays 16.2.4.

| Change | Impact | Risk | Evidence | Rollback impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Film timeline tables | New persistence for films | MEDIUM | One additive migration, table absent in production | Old code ignores the new tables | Apply only with an explicit migration approval and a backup |
| Mock billing gate | Stops the 60 HC cert defect | LOW in production | Gate requires flag, cert database, and loopback. Production has none of these. Registry price unchanged. | Removing the gate restores the old capture behavior | Keep the gate |
| Local certification login | Password login for the disposable database | LOW | Flag absent. `VERCEL` blocks the database check. | Removing the file returns login to the previous route | Do not set the flag in Vercel |
| Logout when identity origin is empty | Avoids a throw and returns `studio_only` | MEDIUM | Origin value on production did not decrypt | Previous code always called the identity helper for ecosystem logout | Confirm the origin value before release |
| Audio create route | New page on existing panels | LOW | Live returns 404. Page is new. | Route disappears, panels used elsewhere remain | Accept as an addition |
| Motion and editor return link | Film can send the user back | LOW | Layout and `/motion/start` diff only | Link disappears | Accept |
| Film MP4 route without `maxDuration` | Export may be killed by the platform limit | HIGH | Route has no `maxDuration`. Local FFmpeg succeeded. Vercel run was not done. | Route disappears with the rollback | Do not release until a production-runtime render is proven or the duration is set and retested |
| Both domains share one deployment | Studio and Motion move together | HIGH | Alias list on `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq` | Rollback restores both aliases together | Treat `motion.homecheff.eu` as part of the same release |

Unchanged page files: `/motion`, `/editor/start`, `/studio/quick-ad`, `/studio/experience`. Unchanged price registry and session module.
