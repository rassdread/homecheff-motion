# Post-deployment verification

Date: 2026-10-19

POST_DEPLOYMENT_SMOKE_TEST = PASSED for unauthenticated checks

BROWSER_E2E = NOT_EXECUTED

Production responses from https://studio.homecheff.eu carry deployment `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`.

## Routes

| Request | Result |
| --- | --- |
| `GET /` | 200 |
| `GET /studio/storyboards` | 200 |
| `GET /studio/projects` | 404, expected, this path has no index page |
| `GET /editor` | 200 |
| `GET /videos` | 200 |
| `GET /studio/projects/cmvcbmxdp00032jryohiw8a84` | 200 HTML for the login gate, not the scene editor |
| `GET /studio/projects/cmvcbmxdp00032jryohiw8a84/character-masters` | 200 HTML for the same login gate |
| `GET /api/studio/storyboards` | 401 `AUTH_REQUIRED` |
| `GET /api/studio/projects/{id}/workspace` | 401 `AUTH_REQUIRED` |
| `GET /api/studio/projects/{id}/storyboard` | 401 `AUTH_REQUIRED` |
| `GET /api/studio/projects/{id}/film-characters` | 401 `AUTH_REQUIRED` |
| `GET /api/studio/projects/{id}/character-masters` | 401 `AUTH_REQUIRED` |
| `GET /api/studio/projects/{id}/animation` | 401 `AUTH_REQUIRED` |
| `GET /api/studio/voice-library?summary=1` | 401 `AUTH_REQUIRED` |
| `GET /api/studio/voice-favorites` | 401 `AUTH_REQUIRED` |

No response contained a Prisma missing-column error. These authenticated routes stop at login, so they do not prove that a signed-in workspace can read `dialogueText`. The column was verified directly in the shared database, and the isolated branch exercised the real scene service.

No scene was created. No dialogue was written to a production scene. No provider was called.

## Signed-in browser

The available browser was on `https://studio.homecheff.eu/login?next=/studio/projects/cmvcbmxdp00032jryohiw8a84`. That is the login page. It is not an authenticated workspace test.

## Database after deploy

Production still has 130 scenes and 0 stored dialogue values. The protected film and the three character-master digests were unchanged at migration time and this smoke test did not write to them.
