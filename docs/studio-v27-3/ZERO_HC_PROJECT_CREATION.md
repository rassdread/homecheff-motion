# Zero-HC film creation

User C wallet before and after: balance `0`, `lifetimeSpent` `0`. Users A and B stayed at `500/0` and `100/0`.

A prompt that does not match the existing film phrases (`V273 Zero HC film...`) opened the generic confirm **Get creative in HomeCheff Studio.** and stayed on `/studio`. That is the existing classifier. It does not call `POST /api/studio/films`.

The explicit request `Create a short promotional film with three scenes. No paid generation.` matches `promotional film`. The confirm cost line was `This creates a film project. Nothing is generated yet.` The make button then assigned:

`/studio/projects/cmvs2nqpl0062dh92uzqi61xk?section=overview&workflow=film`

The row is owned by `v272-user-c@studio.local.test`, title `Create a short promotional film with three scenes`, storyboard `cmvs2nqq50064dh92lpfigltz`. The project is created without scenes. The existing **Scène toevoegen** / **Add scene** button added:

`0 | cmvs2oxy20066dh92kkznw9rc | New scene`

Voice quote for that scene, after a disposable dialogue line was stored and `voiceProfile` `warm_narrator` was sent, `action: "quote"` only:

```json
{
  "status": 200,
  "body": {
    "actionType": "voice_generation",
    "requiredCredits": 15,
    "allowed": false,
    "reason": "free_account_provider_action",
    "provider": "elevenlabs"
  }
}
```

`action: "start"` was not sent. Wallet after the quote remained `0|0`.

The film success path keeps the confirm button pending until `window.location.assign` navigates. A state update after a successful create no longer clears the pending flag first. Evidence: `evidence/zero-hc-report.json`, `evidence/zero-hc-scene.json`, `evidence/zero-hc-quote.json`.
