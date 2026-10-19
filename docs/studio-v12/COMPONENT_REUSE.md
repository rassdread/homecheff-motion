# Component reuse

| Need | Reused | Why not a new system |
|---|---|---|
| Auth | `StudioAuthGate` | Existing silent SSO |
| Media grid and viewer | `StudioProjectMediaBrowser` | V10 categories, ownership, and archive separation. Optional `lockProjectId` only hides the all-projects filter |
| Brand mark | `/brand/homecheff-mark.png` via `ECOSYSTEM_BRAND_MARK_URL` | Existing synced mark |
| Colors and tabs | `studio-visual-tokens.ts` | `#006D52`, `#0067B1`, `#041428` |
| Storyboard and video editors | existing hrefs | Unique repair, versions, and mix tools stay there |
| Voice catalog | character page `#voice` | The catalog component stays inside the character editor |
| Wallet create/charge | not used | Balance is a read of `StudioWallet` |

Not mounted: `StudioV9MusicPanel` and the director wizard completion flow. Both can start paid or persistent generation. The workspace shows a planning notice instead.

The character editor is not copied. The workspace links to `/studio/characters/[id]/edit`.
