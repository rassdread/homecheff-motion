# Studio SP.3 — Public product experience & AI orchestration audit

**Date:** 2026-08-14  
**Repo:** `homecheff-motion`  
**Production:** https://studio.homecheff.eu  

SP.2B / SP.2C: **do not reopen** identity or branding.

## SP.1 findings — current classification

| Original SP.1 issue | Status | Notes |
|---------------------|--------|-------|
| `/studio/experience` missing | **FIXED** | Public route live (200) |
| Experience Packs / Creative Director weak in public | **PARTIALLY FIXED** | Funnel public; primary CTA now points here; still not a full marketing pillar |
| Home CTA biased to Editor | **FIXED** (this phase) | Primary → `/studio/experience`; secondary → how-it-works |
| Assistant doesn’t own Pack→Director→Continuity→Prompt Matrix | **PARTIALLY FIXED** | Video-production intents route to guided experience; full orchestration spine still incomplete |
| Google / central identity missing | **FIXED** (SP.2B) | Do not reopen |
| Public pages not open enough | **PARTIALLY FIXED** | Landings public; nav no longer login-walls discovery |
| Too much behind login | **PARTIALLY FIXED** | Info open; create/start still gated |
| Feels like collection of tools | **PARTIALLY FIXED** | Idea-first CTA; suite tools remain available |

## User journeys (current)

| Persona | Journey |
|---------|---------|
| Anonymous | `/` → understand product → nav to public landings → CTA `/studio/experience` → auth when starting production |
| New authenticated | HC SSO → welcome → guided experience / Assistant |
| Returning | Session reuse → continue / library / Assistant |
| Power user | Direct Editor / Motion / Library / Publish still available |

## P0 shipped (this phase)

1. Suite nav + planet links open **public product pages** (no deceptive login wall).
2. Primary CTA = guided creation (`/studio/experience`), not Editor.
3. Assistant `create_video_production` → `/studio/experience` (or `/studio/start` when project context exists).

## Remaining P1

- Deeper natural-language extraction (LLM path already optional).
- Explicit Pack selection + Director/continuity handoff language for beginners.
- Richer follow-up context memory across creation turns.

## Remaining P2

- Performance pass, legacy route cleanup (`/contact`), sitemap for experience.
