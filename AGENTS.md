<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Releasevolgorde “Riedel” (projectconventie)

Vóór werk als af te ronden te beschouwen en te pushen, **in deze volgorde**:

1. **Migraties** – schema gewijzigd: Prisma-migraties aanmaken/draaien (`npx prisma migrate dev` lokaal, deploy-stappen volgens omgeving).
2. **Build** – `npm run build` (en bij voorkeur eerst `npm run lint`).
3. **Git** – **altijd** `git add` → `git commit` → `git push` (nooit committen vóór staged changes).

De eigenaar noemt deze volgorde kort **“riedel”**: migraties → build → daarna netjes version control tot en met push.
