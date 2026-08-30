# Phase 4 — Public Activation

| Field | Value |
|---|---|
| Flag | `STUDIO_FREE_MUSIC_CATALOG_ENABLED=true` |
| First public-ON buildTime | 2026-08-30T10:30:07.199Z |
| First public-ON deployment | `dpl_AP5rfrJBBCoR1tyhti53xuheBHUi` |
| Phase 4 Free Music code SHA | `da4871c7442c1bbc300d1d160f1a1d5a925e5946` |
| Final live Production SHA (post unrelated auth fix) | `cfe6907f2141cfdfa3eafd02c6ec5ddea8d13636` |
| Final live deployment | `dpl_Ak85q7xw92trVGq8xQS2dWomZPYX` |
| Alias | `https://studio.homecheff.eu` |
| Kill switch | Available (`false` + redeploy) |
| Pilot overrides (final) | **Removed** |

## Sequence

1. Pre-launch gate PASS  
2. Bounded Steve pilot PASS (`dpl_WtN5P2AnzVqLQABaNMCAxbkf9CD7`)  
3. Public ON + smoke PASS  
4. Kill-switch OFF drill PASS  
5. Public ON restore + pilot removal + final smoke PASS  

FAQ/legal/SEO live on `/faq` and `/terms`.
