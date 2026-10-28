# Prompt and provider payload parity

`scripts/v272-prompt-payload.ts` called the existing builders only. `paidProviderCalled` is false. Evidence: `docs/studio-v27-2/evidence/prompt-payload.json`.

Shared instant-video input: style `food_promo`, duration 8, aspect `9:16`, chip `cinematic_soft`, locked text on.

| Check | Result |
| --- | --- |
| Legacy prompt contains the food-promo preset and `TEXT SAFETY RULES:` | yes |
| Unified prompt, after `mergePresetPromptWithUserIdea`, still contains the preset and the safety line | yes |
| Unified prompt contains the scene direction “The guide prepares the product and shows the result.” | yes |
| Legacy length / unified length | 2392 / 2532 |
| `buildBudgetedViduPrompt` length | 2143, under the 3500 cap, no blocks dropped |
| Vidu JSON aspect-ratio field | absent, which matches the existing builder |
| Reference order | logo fixture first, then the uploaded kitchen image |
| Kitchen reference URL | the local-media URL from the real upload |
| Voice model | `eleven_multilingual_v2`, language `nl` |
| Music | `force_instrumental: true`, `music_length_ms: 30000` |
| Sound effect | `duration_seconds: 1` |

The logo URL in that comparison is a ranking fixture used to check that a MUST_PRESERVE logo stays ahead of the character image. It was not uploaded. The kitchen URL is the file stored by `POST /api/uploads/images`.
