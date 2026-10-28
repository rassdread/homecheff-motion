# Preflight and V27.1 recovery

Repository: `rassdread/homecheff-motion`  
Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`  
Branch: `integrate/studio-unified-film-production`

| Check | Result |
| --- | --- |
| Starting HEAD | `33725f4c3ea880c06c3529586c4f21963e9fedaf` |
| V27.1 recovery commit | `ec5e8f828b10ed3bd311ba9145317db906280b97` |
| Commit message | `studio: preserve and certify v27.1 integrations` |
| Push | not performed |

The V27.1 work was uncommitted on top of `33725f4c`. Focused tests before that commit were 61/61, and `npx tsc --noEmit` exited 0. The commit contains 29 files (the V27.1 integration, tests, and `docs/studio-v27-1`). Unrelated untracked files were left unstaged: `.agents/`, `docs/studio-v16/`, `docs/studio-v17/`, `docs/studio-v23-10/`, older `scripts/v23*`, and `skills-lock.json`.

Protected worktrees were read only. Their HEADs after this task:

| Worktree | HEAD |
| --- | --- |
| `/Users/sergioarrias/HomeCheffProjects/homecheff-motion` | `df7c2939` |
| passion-prod | `64da73a3` |
| film-links | `bca1692b` |
| preview-auth | `1013dab9` |

No production host, Neon endpoint, Vercel project, or Stripe call was used.
