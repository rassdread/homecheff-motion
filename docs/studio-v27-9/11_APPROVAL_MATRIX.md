# Approval matrix

One approval does not cover another row. None of these were performed.

| Action | Environment | Status | Evidence | Risk | Rollback | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| Neon branch or restore timestamp | Production Neon `ep-wild-morning-alynrf2i` | NOT DONE. API token expired, so retention is UNVERIFIED. | `06_DATABASE_MIGRATION.md` | A branch is a write. A restore replaces the database. | Delete the unused branch, or do not restore. | A, alone |
| Apply `20261020120000_studio_timeline` | Production `neondb` | NOT APPLIED. SQL is additive. Disposable rehearsal is V27.5. | Read-only query on 2026-10-29. Table absent. | Brief lock on `StudioCreativeProject`. | Leave the tables. | B, after A |
| Deploy worker `4880f888` | Existing Render service `homecheff-motion` | NOT READY. Image not built. Live commit is `4f6ca34a`. | `02_WORKER_IMAGE.md`, `07_RENDER_SERVICE.md` | Restarts the worker and drops in-flight Motion renders. | Redeploy `4f6ca34a`, then read `/health`. | C, after the image build and after B |
| Deploy Studio `4880f888` | Vercel project `homecheff-motion`. Both studio and motion domains. | NOT DONE. Deployment id UNVERIFIED. | `08_RELEASE_ARTIFACT.md` | Customers can start film export. Motion host moves with it. | Promote the re-read deployment of `afbbd4cc`. | D, after C |
| Change production env | Vercel and Render | NOT REQUIRED by the code if the Sept 12 copy is still true. Three flags are UNVERIFIED. | `05_PRODUCTION_ENVIRONMENT.md` | A wrong flag changes login or billing. | Restore the value recorded before the change. | Separate, only if step 4 of the runbook finds a wrong value |
| Blob synthetic upload | Production Blob | BLOCKED. No isolated store. | `04_STORAGE_DEPENDENCIES.md` | Writes a real object. | Delete that object and its library row in the same window. | E, with the synthetic film |
| Synthetic production film | Production worker, app, database, Blob | NOT DONE. Local 60s film is V27.8 only. | `docs/studio-v27-8/FILM_DURATION_TESTS.md` | Real FFmpeg on the live service and one Blob write. 0 HC. | Worker and app rollbacks above. Leave or delete the synthetic asset under this same approval. | E, after D |
| Domain redirect | `motion.homecheff.eu` | OUT OF SCOPE. Not in `4880f888`. | Product decision from earlier rounds. | Would move Motion traffic. | Remove the redirect. | Later, not this release |

Commands that are allowed only after the matching approval:

```bash
npx prisma migrate deploy
```

Render dashboard deploy of commit `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae` on service `homecheff-motion`.

Vercel production deploy of that same commit to project `prj_29omEPF5Hmob1eGlRjoJNb9t3m2f`.
