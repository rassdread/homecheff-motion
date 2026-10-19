# MADE WITH PASSION workflow

Project `cmvcbmxdp00032jryohiw8a84`. Owner `cmoez6kkh0000lb04f9emsa5f`. About 55 seconds. English dialogue, Dutch subtitles, narrator, HomeCheff end card.

Characters, already stored, not to be regenerated:

- Baker `cmvdlq3wy0005k007dpq2mp8c`
- Potter `cmvdlrtuo000fk007np7d6ft3`
- Gardener `cmvdltib5000pk00762r013fr`

## Already possible

1. Open the creative project and the character records.
2. Choose an ElevenLabs voice per character from the local catalog and save it on the character. Cost is zero until a preview or a line is synthesized.
3. Write scene descriptions on a storyboard and attach the three characters.
4. Generate **new scene stills** that reference the masters. This is a paid image call. The master files themselves are not the request target.
5. Send chosen stills through the existing Vidu animation project and export an MP4.
6. Put Dutch on a finished motion file through language export, if the line text is available.
7. Find the stills and the final video in the media library.

## Missing

- The creative project is not linked to a storyboard or an animation project. Someone must create those rows and set the foreign keys. That write is a later phase, not this audit.
- No shared timeline for dialogue, narrator, music, and the end card.
- Voice profiles on the three characters are empty.
- Narrator is not a character yet.
- The director cannot perform steps 3–6. It can only suggest them.
- Music and SFX are beds, not cues on a clock.

## Reuse

Master URLs, character ids, voice catalog, scene image service, Vidu project, language export, media browser, HC reserve/capture/refund.

## Paid steps and approval

| Step | Paid | Approval |
|---|---|---|
| Link project, write scenes, pick voices | no | save |
| Preview a voice | yes | existing preview confirm |
| Scene still | yes | new quote, same image rule |
| Motion segment | yes | new quote, motion rule |
| Spoken line and narrator | yes | voice quote |
| Dutch subtitles from typed text | no, if it is an overlay of known text | save |
| Dutch from transcription | yes | STT quote |
| Music bed | yes | music quote |
| Final MP4 assembly of existing segments | maybe, if a render job is required | export quote |

## Where files live

Masters: character reference URLs and draft library rows. Scene stills: `StudioSceneImage`. Motion: `AnimationTransition.outputVideoUrl` and `ProjectRenderVersion.finalVideoUrl`. Library reads those tables. Do not copy the masters into a new bucket.

## How the director helps

It may draft the scene list and the Dutch lines in the panel. It may pre-select catalog voices. Each paid row becomes a quote the founder accepts. It must refuse `GENERATE_IMAGE` when the target is one of the three master ids.
