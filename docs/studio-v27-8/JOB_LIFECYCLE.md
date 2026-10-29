# Job lifecycle

Existing `StudioGenerationJob` statuses are used. No new status values and no migration.

| State | Meaning |
| --- | --- |
| queued | Accepted in the database. The worker has not claimed it. |
| processing | Claimed. `attempt` was incremented. |
| succeeded | Library asset stored. `outputAssetId` is set. |
| failed | Terminal. A new export creates a new job. |
| cancelled | The owner cancelled it. |

Claim rule: update the row only when status is `queued`, `pending`, or `processing`, `attempt` is below `maxAttempts` (2), and both credit fields are 0.

A succeeded job with the same library source returns the existing asset and does not encode again. This was verified on the local worker.

A worker killed with `SIGKILL` while a job was `processing` restarted, reclaimed the job (`attempt` 2), and completed it. A different processing job already at `attempt` 2 was marked `failed` with `errorCode` `interrupted` and was not encoded.

A non-zero `creditCost` is refused with HTTP 422 and code `billing` before FFmpeg starts.

Stages stored on the job are coarse: `preparing`, `rendering_scenes`, `processing_audio`, `finalizing`, `saving`. There is no percent.
