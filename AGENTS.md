<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Releasevolgorde “Riedel” (projectconventie)

Vóór commit/push, **in deze volgorde**:

1. **`git pull`**
2. **Prisma** — `npx prisma validate` → `npx prisma generate` (migratie alleen bij schema/migratie-wijziging)
3. **Quality** — `npm run lint` → `npm run build` → `npm run test`
4. **Verify** — tests groen; geen onbedoelde schema/migratie pending; bedoelde bestanden in commit
5. **Git** — `git status` → `git add .` → `git commit` → `git push`
6. **Return** — commit hash, files changed, build/test/push status

Zie `.cursor/rules/riedel.mdc` voor details.
