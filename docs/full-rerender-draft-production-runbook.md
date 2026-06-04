# Full rerender draft — production runbook

## Symptom

- **Nieuwe versie maken** stuck on “Concept laden…”
- Browser console: repeated `500` on `/api/instant-premium/projects/[id]/full-rerender-draft`
- **Concepten** tab empty or failing

## Required fix commit

`827d443` — harden draft API, structured 503 when storage missing, no bootstrap retry loop.

Verify on `main`:

```bash
git merge-base --is-ancestor 827d443 HEAD && echo OK
```

## Database

Migration: `prisma/migrations/20260604120000_project_full_rerender_draft`

Table: `ProjectFullRerenderDraft`

On the **production** database host:

```bash
npx prisma migrate deploy
npx prisma generate
```

Then **redeploy** the app (Vercel/host) so the server bundle and Prisma client match the schema.

## Expected API behaviour (after deploy + migrate)

| Case | GET response |
|------|----------------|
| No draft row | `200` `{ "ok": true, "draft": null, "updatedAt": null }` |
| Table missing | `503` `{ "ok": false, "code": "DRAFT_STORAGE_UNAVAILABLE", ... }` |
| Other server error | `500` with `code: "FULL_RERENDER_DRAFT_FAILED"` |

Frontend (post-827d443): no automatic retry on 500; user sees retry / start-without-concept banner; loading ends.

## Production logs

Search runtime logs for:

```
[full-rerender-draft]
```

Fields: `method`, `projectId`, `userId`, `prismaCode`, `message`, `stack`.

Common causes:

| Log hint | Action |
|----------|--------|
| `P2021` / relation does not exist | Run `migrate deploy` |
| `projectFullRerenderDraft` + undefined | Redeploy after `prisma generate` |
| `renderVersions` / heavy include on project load | Fixed: draft routes use slim `verifyInstantProjectDraftAccess` + `getInstantProjectForDraftEnsure` |
| Auth / 401 | Session cookie / `requireActiveUser` |

## Known production error (fixed)

If logs show:

`Attempted to call emptySceneTextDraft() from the server but emptySceneTextDraft is on the client`

→ `full-rerender-draft.ts` must import from `@/lib/instant-scene-text-draft-model`, not `instant-mode-panel`.

## Bootstrap sequence (Network tab)

1. **GET** `/full-rerender-draft` — should be first.
2. If `200` + `draft: null` → one **POST** to create.
3. No further GET/POST loop. PUT only after editor is ready (autosave).

Admin/dev editor shows diagnostic lines (`Draft GET failed`, `Status: …`) when `NEXT_PUBLIC_ENABLE_DEBUG_UI` or admin or development.

## Manual smoke test

1. Open a completed instant project → **Nieuwe versie maken** → `/videos/{id}/edit-version`
2. Network: one GET draft → `200` or `503` (not endless 500)
3. `/videos?section=concepts` loads without gallery 500
