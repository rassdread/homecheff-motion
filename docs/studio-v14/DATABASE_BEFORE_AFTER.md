# Database before and after

Read-only aggregates. No personal data and no credentials.

## Identity

Production and preview use Neon project `lively-hill-12198672`, branch `br-summer-unit-alsnfcyd`, database `neondb`, endpoint `ep-wild-morning-alynrf2i`.

## Counts

| Measure | Before | After |
| --- | --- | --- |
| StudioScene | 130 | 130 |
| Scenes with dialogueText | column absent | 0 |
| StudioCreativeProject | 3 | 3 |
| StudioStoryboard | 27 | 27 |
| StudioCharacter | 6 | 6 |
| StudioSceneCharacter | 64 | 64 |
| StudioStoryboardSubtitleTrack | 2 | 2 |
| Public tables | 62 | 62 |

Description digest `ac01bdc9f026816cff1a0287f5aad918` and storyboard-link digest `f4b19c573c3e2ccec22882eb17cd923f` were unchanged. 119 descriptions were non-empty before and after.

Narration digest `c5fec63bbe1b762cb7ffc9b2734fedc5` was unchanged. One storyboard has non-empty narration.

Subtitle digest `2de7a7893ea43613b37639b3477ea31c` was unchanged. Both tracks are language `en`, status `ready`. There was no `nl` subtitle track to preserve. The Dutch subtitle writer was not run.

## Protected records

MADE WITH PASSION `cmvcbmxdp00032jryohiw8a84` still has no storyboard and no animation project. Its `updatedAt` stayed `2026-10-19T00:35:42.747Z`.

Character master URL and storage-key digests were unchanged:

| Character | URL digest | Storage digest |
| --- | --- | --- |
| Baker `cmvdlq3wy0005k007dpq2mp8c` | `fea31d05ffdf167f528a4db2d4ab93ba` | `157f4426299e1e862b21008c447c3dd5` |
| Potter `cmvdlrtuo000fk007np7d6ft3` | `b048c99e05a82fb99c910ea1a3862908` | `3883b9a8c2359612deebba4291546132` |
| Gardener `cmvdltib5000pk00762r013fr` | `cb8f6d77ceade94604ebea43ed1da36c` | `1dab063c76348187dc5b1b79d7d7c89b` |

## Schema delta

The only added column was `dialogueText`. No column was removed. The only added migration history row was `20261019153000_studio_scene_dialogue_text`. The two historical rolled-back rows stayed rolled back.

## Isolated service test

A second branch, `v14-dialogue-integration` (`br-late-shape-alpmjnnp`), was created from production after the column existed. The real `createStudioScene`, `updateStudioScene`, and `deleteStudioScene` functions ran only against that branch:

- create stored English dialogue separately from the description
- update replaced the dialogue
- clear stored null
- a different account received `FORBIDDEN` and did not write
- narration and the two subtitle tracks were unchanged
- the temporary scene was deleted and the scene count returned to 130

That branch was then deleted. Production scene count remained 130, with zero filled dialogue values.
