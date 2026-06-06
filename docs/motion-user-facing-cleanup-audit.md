# Motion — User-facing cleanup & UX copy audit

**Date:** 2026-06-06  
**Scope:** Full app (`motion.homecheff.eu`) — product surfaces for non-admin users  
**Goal:** Gewone gebruikers zien alleen duidelijke producttaal; admin/dev/debug alleen met expliciete gate.

---

## User-facing cleanup

Legenda status: **verwijderd** · **vervangen** · **alleen admin** · **gated** · **twijfel** · **open**

### Globaal / layout

| Tekst / element | Locatie | Probleem | Nieuwe tekst / actie | Status |
|-----------------|---------|----------|----------------------|--------|
| `build {sha} · {date}` | `motion-build-debug-badge.tsx` | Build SHA zichtbaar | Alleen `admin` of `NEXT_PUBLIC_ENABLE_DEBUG_UI` | **alleen admin** (was al gated) |
| `nav.role.admin` / `power` | `app-shell-user-bar.tsx` | Rol-label in nav | Acceptabel voor ingelogde users; geen debug | **twijfel** — overweeg “Pro” i.p.v. “Power” |
| `nav.admin` | Nav | Admin link | Alleen zichtbaar voor admins (server/layout) | **alleen admin** |

### Homepage / landing (`/`)

| Tekst | Locatie | Probleem | Actie | Status |
|-------|---------|----------|-------|--------|
| `landing.mascotPlaceholder` | `en.ts` / `nl.ts` | “placeholder” in copy | Interne design-notitie; niet op live hero | **open** — controleren of nog gerenderd |
| `landing.ecosystem.comingSoon` | `home-ecosystem-page` | Coming soon zonder datum | Vervang door concrete CTA of verwijder kaart | **twijfel** |
| Lange studio-vision copy | `studio.subtitle` (hub advanced) | Developer-roadmap taal | Alleen in advanced hub; splash is schoon | **gated** (production simple) |

### Discover (`/discover`)

| Tekst | Locatie | Probleem | Actie | Status |
|-------|---------|----------|-------|--------|
| Marketplace “binnenkort” | `discover.marketplace.*` | Lege belofte | Duidelijke “Nog niet beschikbaar — maak nu video’s met Motion” | **twijfel** |
| Overige copy | `discover.*` | Redelijk productgericht | Geen actie | OK |

### Studio / Motion

| Tekst | Locatie | Probleem | Nieuwe tekst | Status |
|-------|---------|----------|--------------|--------|
| `Advanced studio features` | `studio.productionMode.advancedToggle` | Feature-flag jargon | “More studio tools” / “Meer studio-opties” | **vervangen** |
| `Studio source`, `Motion override` | `studio.sourceBadge.*` | Interne metadata-labels | “From storyboard” / “Edited in Motion”; badges verborgen in simple mode | **vervangen + gated** |
| `V34.5 debug overlay` | `studio.mouthAnimation.hint` | Dev-versie in hint | Menselijke fallback-uitleg | **vervangen** |
| `OPENAI_API_KEY`, `VIDU_API_KEY` | `studio.production.provider.*` | Env-var instructies aan users | Alleen op `/studio/.../production` (advanced link) | **alleen admin/advanced route** |
| Provider registry pagina | `/studio/providers` | Volledig dev-surface | Verborgen uit simple hub; directe URL blijft | **gated** |
| API error strings in UI | `studio-storyboard-editor.tsx`, libraries | Raw `res.data.error` | `userFacingApiError()` helper toegevoegd; rollout per component | **deels open** |
| Workspace netwerkfout EN hardcoded | `studio-workspace-load-error.ts` | Technische CORS-tekst | i18n + fallback copy | **vervangen** |
| Render trace panel | `project-render-trace-panel.tsx` | “re-render”, “export” | Copy is al user-vriendelijk (“How this video was made”) | OK |
| `MotionBuildDebugBadge` op splash/workspace | `studio-production-splash`, `studio-workspace-shell` | Build info | Admin/debug only | **alleen admin** |

### Animate / Instant (`/animate/instant`, progress, success)

| Tekst | Locatie | Probleem | Nieuwe tekst | Status |
|-------|---------|----------|--------------|--------|
| `instant.advancedCreator.hint` | `en.ts` | “pipeline debug” | Alleen `advanced-creator-settings-panel` + `isAdmin` | **alleen admin** |
| `instant.bakedText.adminDebugTitle` | i18n | “(debug)” in titel | Admin panel only | **alleen admin** |
| `instant.forceRebuild.hint` | i18n | “For debugging only” | `instant-recovery-action-buttons` admin only | **alleen admin** |
| `EXPORT_TIMEOUT_MS` | `instant.progress.rebuildFinalTimeout` | Server env in user copy | Menselijke timeout-tekst | **vervangen** |
| `identicalOutputDetected`, segment hashes | `playback-debug-panel.tsx` | Raw debug velden | `isAdmin \|\| ENABLE_DEBUG_UI` op video detail | **alleen admin** |
| `Final MP4 preview placeholder` | `animate.completed.placeholder` | Placeholder-jargon | “Your video preview will appear here when ready.” | **vervangen** |
| Concept bootstrap debug block | `full-rerender-editor.tsx` | `projectId`, `draftLoadState` | `shouldShowFullRerenderDraftDiagnostics(admin)` | **alleen admin** |
| No-credit render check | `no-credit-render-check-panel.tsx` | Vidu prompt chars | `isAdmin` gate | **alleen admin** |
| Beta language export | `language-export-beta-section.tsx` | “Beta” label | Admin/debug toggle; overweeg “New language version” voor users | **twijfel** |
| Stripe test mode hint | `instant.checkout.*` | Testmodus uitleg | Alleen tonen als test mode actief server-side | **twijfel** |

### Videos / project detail (`/videos/[id]`)

| Tekst | Locatie | Probleem | Actie | Status |
|-------|---------|----------|-------|--------|
| `PlaybackDebugPanel` | `videos/[id]/page.tsx` | Segment hashes, ffmpeg | `showPlaybackDebugPanel = debugUI \|\| admin` | **alleen admin** |
| `internalUsd`, provider events | `project-video-cost-card.tsx` | Kostprijs intern | Alleen `isAdmin` block | **alleen admin** |
| `providerJobIds` | `render-activity-status-card.tsx` | Job IDs | Alleen `isAdmin` | **alleen admin** |
| `provider` in render copy | `renderActivity.*` | Technisch | Teksten vereenvoudigd (geen “provider status”) | **vervangen** |
| Storage audit errors (mono) | `project-storage-usage-card.tsx` | Raw error | Alleen admin ziet `font-mono` detail | **alleen admin** |
| Version center lineage | `version-center-lineage-panel.tsx` | “lineage” concept | Copy is OK; advanced tab gated | OK |

### Mijn verbruik / HCP (`/mijn-verbruik`)

| Tekst | Locatie | Probleem | Actie | Status |
|-------|---------|----------|-------|--------|
| `err.message` from server | `mijn-verbruik/page.tsx` | Prisma/stack leak | Alleen `usage.loadError` | **vervangen** |
| Project ID fallback in table | `customer-usage-dashboard.tsx` | `projectId.slice(0,8)` | Toon titel; ID alleen als geen titel | **twijfel** |

### Login / register

| Tekst | Locatie | Probleem | Actie | Status |
|-------|---------|----------|-------|--------|
| `console.debug` auth logs | `auth-form.tsx` | Dev console | Alleen `NODE_ENV=development` | **gated** (dev only) |

### Admin (bewust technisch)

| Gebied | Status |
|--------|--------|
| `/admin`, render analytics, provider CSV | **alleen admin** — geen user cleanup nodig |

### Netwerk / fetch helper

| Tekst | Locatie | Probleem | Nieuwe tekst | Status |
|-------|---------|----------|--------------|--------|
| CORS/network hint | `client-api-fetch.ts` | “CORS blocked” | “We could not reach the server…” | **vervangen** |

### Resterende twijfelgevallen

1. **Discover marketplace** — lege “coming soon” kaart; verwijderen of invullen met waitlist?
2. **Beta language export** — “Beta” in label voor power users die feature wél zien.
3. **`nav.role.power`** — interne rolnaam in UI.
4. **Studio production provider cards** — OPENAI_* strings als admin per ongeluk production center opent.
5. **Brede rollout `userFacingApiError()`** — nog niet in alle 30+ `setError(err.message)` call sites.
6. **Engels als default `lang` in root layout** — locale switch werkt, maar eerste paint EN.

### Geïmplementeerde code-fixes (deze sprint)

- `src/lib/user-facing-error.ts` — technische API-fouten filteren
- `studio-source-badge.tsx` — verborgen in production simple mode
- `client-api-fetch.ts` — vriendelijkere netwerkfout
- `mijn-verbruik/page.tsx` — geen raw server errors
- i18n updates (badges, mouth hint, placeholder, render activity, advanced toggle, rebuild timeout)

---

## UX Copy Audit

### Te technisch

| Pagina | Huidige tekst | Probleem | Aanbevolen |
|--------|---------------|----------|------------|
| Video detail | “Provider job IDs” (admin) | Dev | Blijft admin-only |
| Studio production | “Provider execution plan” | Jargon | “What will run when you generate” |
| Instant progress | “Rebuild final video” | Technisch | “Assemble video again” |
| Usage dashboard | “Credits consumed per render” | OK maar zakelijk | “What you spent on videos” |
| Version center advanced | “Full re-renders” | Jargon | “New video from scratch” |

### Te veel jargon

| Term | Waar | Vervanging |
|------|------|------------|
| Storyboard | Overal | OK — uitgelegd in splash stappen |
| Director / workspace | Studio | OK voor doelgroep; onboarding helpt |
| Handoff | Studio → Motion | “Open in Motion” (al gebruikt) |
| Preset (basic/pro/smooth) | Animate | “Style” of vertaalde preset-namen |
| Render / export | Videos | “Video maken” / “Video klaarzetten” waar mogelijk |
| Provider | Studio production, pricing | “Service” of verbergen |
| Credits | Billing | OK — wel uitleg “1 credit ≈ …” op pricing |

### Onduidelijk voor nieuwe gebruikers

| Pagina | Vraag van user | Huidige UI | Aanbevolen |
|--------|----------------|------------|------------|
| `/studio` splash | Waar begin ik? | 3 stappen + CTA storyboards | ✅ Goed na 8883c48 |
| `/studio/workspace` | Wat is dit scherm? | “Scene Workspace” | “Edit your story” + storyboardtitel |
| `/discover` | Kan ik hier iets kopen? | Marketplace dashed card | “Marketplace — not open yet. Create videos with Motion →” |
| `/videos` | Wat is het verschil tussen projecten? | Lijst met status | Statuslabels OK; tooltip “Your videos” |
| `/animate/instant` | Hoeveel stappen? | Wizard steps | Step titles OK; step 1 uitleg korter |
| Checkout success | Is mijn betaling gelukt? | Success page | Duidelijke “Payment received — your video is starting” |

### Te veel uitleg

| Locatie | Issue | Actie |
|---------|-------|-------|
| Studio hub (advanced) | Vision + roadmap card | Alleen in advanced mode |
| Instant wizard lange hints | `instant.creatorPrompt.hint` | Inklapbaar “Tips” |
| Video detail (vóór cleanup) | Meerdere panels | Al opgeschoond in production mode sprint |

### Te weinig uitleg

| Locatie | Issue | Aanbevolen |
|---------|-------|------------|
| Workspace load error | Was lege spinner | Retry + terug naar storyboards ✅ |
| Advanced toggle | Onduidelijk wat het doet | Label “More studio tools” + tooltip “Shows classic editor, production center, …” |
| Version center | Verschil original/latest | Korte zin onder tabs |

### Nieuwe aanbevolen teksten (per pagina)

#### Homepage `/`
- **Hero CTA:** “Maak je eerste video” (primair) · “Plan een verhaal in Studio” (secundair)
- **Coming soon-tegel:** “Binnenkort: deel en ontdek video’s van andere makers”

#### Discover `/discover`
- **Marketplace:** “De marketplace komt later. Maak nu al video’s met Motion.”
- **CTA:** “Start met Motion →”

#### Studio splash `/studio`
- ✅ “Plan je verhaal. Render met vertrouwen.” — goed
- **Advanced toggle tooltip (nieuw):** “Toon extra tools zoals de klassieke editor en productiecentrum.”

#### Workspace `/studio/workspace`
- **Header label:** “Story editor” i.p.v. “Scene Workspace” (optioneel)
- **Load error:** ✅ menselijke copy + retry
- **Empty scenes:** ✅ “Create your first scene”

#### Animate `/animate/instant`
- **Footer primary:** “Generate video” consistent NL/EN
- **Error generic:** “Something went wrong. Try again or contact support.”
- **Progress stuck:** “Still working… Large videos can take a few minutes.”

#### Video detail `/videos/[id]`
- **Render trace title:** ✅ “How this video was made”
- **Status generating:** “Your video is being created.”
- **Cost card (user):** “What this video cost” (geen USD intern)

#### Mijn verbruik `/mijn-verbruik`
- **Intro:** “See what you spent on videos in the last 30 days.”
- **Error:** ✅ generiek zonder Prisma

#### Login `/login`
- ✅ Geen technische copy; network error al user-friendly

---

## Prioriteit vervolg

1. **P0** — `userFacingApiError()` in alle studio `setError((res.data as …).error)` paden
2. **P1** — Discover marketplace copy of route tijdelijk verbergen
3. **P1** — Studio production provider messages herschrijven voor het geval advanced users production center openen
4. **P2** — “Scene Workspace” → “Story editor” (i18n keys)
5. **P2** — Beta language export label de-jargoniseren
6. **P3** — `nav.role.power` → “Pro”

---

## Test-checklist (handmatig)

- [ ] Ingelogd als **user**: geen build badge, geen playback debug, geen provider IDs
- [ ] Studio workspace simple mode: geen source badges
- [ ] Safari workspace: menselijke fout bij offline, geen CORS-tekst
- [ ] `/mijn-verbruik` bij DB-fout: geen stack trace
- [ ] Admin: debug panels nog steeds bereikbaar
