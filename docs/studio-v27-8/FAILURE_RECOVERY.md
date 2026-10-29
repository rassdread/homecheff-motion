# Failure and recovery

Local worker, synthetic data, commit `4880f888`.

| Case | Result |
| --- | --- |
| Missing bearer | HTTP 401 |
| Wrong bearer | HTTP 401 |
| Unknown job id | HTTP 404 |
| `creditCost` 30 | HTTP 422 `billing`, job `failed`, no encode |
| Timeline revision that does not match | job `failed`, `conflict` |
| Deleted source file | job `failed` |
| Media directory not writable | job `failed`, `storage` |
| Repeat of a succeeded job | HTTP 200, same library asset, one row |
| Other user reads the job | null / HTTP 404 in the browser |
| `SIGKILL` during render | restart completed the job |
| `attempt` already at `maxAttempts` | `failed`, `interrupted`, not encoded |
| Empty timeline in the browser | the page showed the failure alert |

Temp directories are removed in the existing `finally` of `executeOwnedFilmExport`. Wallet balances stayed at 500. No secret was returned in the worker error body. The film route no longer puts the exception message in the JSON response.

Directory mode was restored after the storage test.
