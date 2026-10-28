# Wizard file picker

Authenticated browser session as user A on `http://127.0.0.1:3462`.

The film scene link opened:

`/studio/photo-video?idea=The+guide+prepares+the+product+and+shows+the+result.&projectId=cmvrdlbwg0005dh92s468jz8g&scene=cmvrdnblh000bdh92jjl4bhrb&storyboardId=cmvrdlcet0007dh92f8qonc00`

The preserved idea on the page was `The guide prepares the product and shows the result.`

`setInputFiles` targeted the existing control `[data-testid="px4a-file-input"]` with `/tmp/homecheff-studio-v27-2-cert-media/kitchen.png` (PNG, 960×540, 2746 bytes). The composer then called the existing `uploadRequirementReference` path, which preprocesses the file and posts `workingImage` plus `thumbnailImage` to `POST /api/uploads/images`.

Result shown on the page and stored in `evidence/workflow-report.json`:

- Status text: `Image uploaded`
- URL: `http://localhost:3462/api/studio/local-media/c6c23c80-23f6-48a6-bf5f-cdcff9034d69`
- Screenshot: `evidence/wizard-upload-1440.png` shows the idea, the status, the local-media URL, a photo thumbnail, and **Use on this scene**

The first attempt posted a single `file` field. The existing route requires `workingImage` and `thumbnailImage`, so it returned 400 and the page said the image could not be uploaded. That path was replaced with the existing requirement uploader. The successful run is the one above.

## Provider assembly

`scripts/v273-prompt-payload.ts` called the existing builders and wrote `evidence/prompt-payload.json`. No provider was called.

| Check | Value |
| --- | --- |
| Legacy prompt length | 2392 |
| Unified prompt length | 2532 |
| Unified contains the user direction | yes |
| Safety line present in both | `TEXT SAFETY RULES:` |
| Vidu budgeted length | 2143 of 3500 |
| Truncated or dropped blocks | none |
| `aspect_ratio` field inside the Vidu prompt | no |
| Reference order | `logo-1`, then `v273-kitchen` |
| Uploaded image URL in the reference list | yes |
| Voice model | `eleven_multilingual_v2`, language `nl` |

The Vidu logger printed `charsBefore: 2636`, `charsAfter: 2143`, `truncatedBlocks: []`.
