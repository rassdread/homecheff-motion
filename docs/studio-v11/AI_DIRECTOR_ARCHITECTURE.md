# AI director architecture

## Current executable actions

None through the director. The briefing wizard (`buildStudioV11DirectorWizard`) returns suggestions, questions, and a confidence score. Scene, sound, voice, and music director modules build plans. They do not persist jobs or call providers.

Generation that exists today is started by the manual UI routes, with owner checks and, on those routes, `authorizeStudioAction`.

## Rule

The director is a client of the same services the buttons call. It never gets a provider API key. It never writes the wallet itself. It submits an action to a server router that:

1. checks the session user owns the project and the character;
2. validates the payload;
3. returns a quote;
4. waits for a second request that includes the quote id and `approved: true`;
5. calls the existing service;
6. returns the job id.

## Shared envelope

```json
{
  "action": "GENERATE_IMAGE",
  "projectId": "cmvcbmxdp00032jryohiw8a84",
  "idempotencyKey": "client-generated",
  "quoteId": null,
  "approved": false,
  "input": {}
}
```

| Concern | Rule |
|---|---|
| Owner | Session user must equal `StudioCreativeProject.ownerId` and any character `ownerId` |
| Project | Every asset write includes `projectId`. Scene writes also include `storyboardId` owned by that project |
| Validation | Zod schema per action. Reject unknown provider ids |
| Estimated HC | `StudioPricingRule` for the capability. Show units (images, seconds, characters) |
| Approval | Required when estimated HC > 0. Zero-cost writes (rename, reorder) still require the user to send the action; they do not need a wallet quote |
| Execution | Existing service only |
| Job | `StudioGenerationJob` for provider work. Plain DB writes return the row id |
| Persistence | Scene image, animation transition, character voice field, or timeline clip. Never a side folder |
| Audit | Existing generation job plus a director action log: user, action, quote, job, result id. Do not log prompts that contain secrets |
| Errors | Surface provider status. Do not retry a charged call automatically |
| Retry | User retries with a new idempotency key. Same key returns the original job |
| Rollback | `refundStudioActionReservation` if the provider fails before a usable asset. Do not delete a previous master to “roll back” |

## Proposed actions

These names are not implemented.

| Action | Input | Service to call | HC |
|---|---|---|---|
| `CREATE_PROJECT` | name, language | creative project create | 0 |
| `UPDATE_PROJECT` | name, links to storyboard id | creative project update | 0 |
| `CREATE_CHARACTER` | name, description, clothing | character create. No image unless `GENERATE` is separate | 0 |
| `UPDATE_CHARACTER` | text fields, voice id | character update | 0 |
| `ASSIGN_CHARACTER_VOICE` | character id, catalog voice id, language | character voice fields | 0 (catalog is local). Preview is `GENERATE_DIALOGUE` or the existing preview action |
| `CREATE_SCENE` | order, description, character ids | storyboard scene create | 0 |
| `UPDATE_SCENE` | description, action, emotion, dialogue | scene update | 0 |
| `GENERATE_IMAGE` | scene id, character ids (must already have masters) | scene image service, references required | image rule (masters historically 125 HC) |
| `GENERATE_VIDEO` | scene id, chosen image id, duration | Vidu via animation project | motion rule |
| `GENERATE_DIALOGUE` | scene id, text, character or narrator voice id | ElevenLabs TTS | voice rule |
| `ADD_MEDIA_TO_SCENE` | scene id, existing asset id | link, no provider | 0 |
| `ADD_CLIP_TO_TIMELINE` | track, source id, start ms | timeline service, after that model exists | 0 |
| `UPDATE_TIMELINE` | clip trim, order, volume | timeline service | 0 |
| `GENERATE_SUBTITLES` | language `nl`, source audio or dialogue text | STT or text overlay. Dutch for Passion can be authored text without STT | STT only if audio is transcribed |
| `PREPARE_EXPORT` | timeline or animation project id | validate assets exist | 0 |
| `EXPORT_FILM` | prepared id | existing animation export | render rule |

`GENERATE_IMAGE` on Baker, Potter, or Gardener master ids is rejected. New scene stills may reference them.

## Security

The model returns JSON. The server ignores any field that is not in the schema, including a requested provider, a price, or another user’s id. Tool calling in the browser is not authorization.
