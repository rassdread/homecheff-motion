# Zero-HC regression

User C (`v272-user-c@studio.local.test`, id `cmvrdb5ep000adhrzv85bhal6`) signed in on `http://127.0.0.1:3462`.

Prompt: `Create a short promotional film with three scenes for the final local check. No paid generation.`

The confirm cost line was: `This creates a film project. Nothing is generated yet.`

Created project `cmvscxnvi000hdht73dxe9vn8`, storyboard `cmvscxnwd000jdht7zow5tznl`, owner user C.

Add scene created `cmvsd0ps4000ldht70d0g6rb2`, order 0, title `New scene`.

The scene form saved spoken dialogue `Welkom bij HomeCheff. Dit is een gratis project.` The database still had that text after reload.

Voice quote, action `quote` only, profile `warm_narrator`:

| Field | Value |
| --- | --- |
| HTTP | 200 |
| allowed | false |
| reason | `free_account_provider_action` |
| requiredCredits | 15 |
| provider | elevenlabs |
| actionType | `voice_generation` |

No `start` request was sent. User C wallet stayed `0` balance and `0` lifetime spent. User A stayed `500/0` and user B stayed `100/0`.
