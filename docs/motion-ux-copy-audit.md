# UX Copy Audit — Motion / HomeCheff

**Date:** 2026-06-06  
**Perspective:** Volledig nieuwe gebruiker (geen kennis van Studio, Motion, credits, providers)  
**Locales:** `en.ts` / `nl.ts` (product copy); admin-routes buiten scope behalve waar ze lekken.

Legenda classificatie per tekst:
- **A** = geschreven voor developer  
- **B** = geschreven voor admin  
- **C** = geschreven voor bestaande power user  
- **D** = nieuwe gebruiker begrijpt het direct  

---

## UX Copy Audit

### Te technisch

| Pagina | Key / element | Was | Probleem (A/B/C) | Nieuw (EN) | Status |
|--------|---------------|-----|------------------|------------|--------|
| Studio splash | `studio.splash.subtitle` | “without the old feature grid” | A/C | “Shape your story scene by scene, then turn it into video.” | **vervangen** |
| Studio splash | `studio.splash.step2` | “Director and production insights” | A/C | “Edit each scene — voice, music, and visuals.” | **vervangen** |
| Workspace | `studio.workspace.label` | “Scene Workspace” | C | “Story editor” | **vervangen** |
| Workspace inspector | `readinessScore`, `handoffSummary` | “Production readiness”, “Handoff readiness” | A/C | “Ready to make video”, “Ready for Motion” | **vervangen** |
| Workspace inspector | `qaIssues` | “QA — composition” | A | “Composition check” | **vervangen** |
| Workspace error | `networkBody` | Safari / access control | A | “We couldn’t connect. Check internet, sign in again, retry.” | **vervangen** |
| Workspace hint | `missingStoryboardHint` | `?storyboardId=` | A | “Pick a storyboard from your list first.” | **vervangen** |
| Pricing | `pricing.subtitle` | “provider usage… admins see margin” | B | “You pay per video you make. Sign in to see your balance.” | **vervangen** |
| Pricing | `pricing.motion.body` | “segment generation and final merge” | A | “Each video uses credits based on length and settings.” | **vervangen** |
| Usage (HCP) | `usage.intro` | “Credits, status, project links per render” | C | “What you spent on videos — dates, prices, and links.” | **vervangen** |
| Usage | `usage.privacyNote` | “internal provider costs… admin-only” | B | “Prices shown are what you pay — no hidden fees on this page.” | **vervangen** |
| Instant step 2 | `instant.step2.description` | “sent to the AI” | A | “Drag to set the order of your images.” | **vervangen** |
| Version center | `versions.center.lineage.title` | “Version lineage” | A/C | “Version history” | **vervangen** |
| Landing flow | `landing.flow.step3` | “recover stuck jobs” | A/C | “Watch progress until your video is ready.” | **vervangen** |
| Landing | `landing.flow.highlight3` | “render analytics” | B/C | “Clear overview of what each video cost.” | **vervangen** |

### Te veel jargon

| Term | Waar | Voor wie (A/B/C) | Vervanging |
|------|------|------------------|------------|
| Storyboard | Studio overal | D* | Behouden — core productterm; uitgelegd in splash stappen |
| Motion | Nav, CTAs | D* | Behouden — merknaam product |
| Render / re-render | Videos, versions | C | “Make video” / “New video from same photos” |
| Credits | Pricing, usage | C | Behouden + korte uitleg “credits = what you spend per video” |
| Director | Studio, landing | C | “Scene editor” of weglaten |
| Workspace | Studio | C | “Story editor” |
| Handoff | Inspector | A/C | “Ready for Motion” |
| Text beats | Landing, handoff badges | C | “On-screen text” |
| Provider | Pricing, production (advanced) | B | Verbergen of “service” |
| Preset (smooth/pro) | Animate | C | Stijlnamen OK; “preset” vermijden in uitleg |
| Asset | Studio libraries | C | “Character / location / prop” concreet |
| Full rerender | Version center | C | “New video from your photos” |
| Segment | Instant progress (admin) | A | Alleen admin-debug |

### Onduidelijk voor nieuwe gebruikers

| Pagina | Wat denkt de user? | Wat wil hij? | Vraag in het hoofd | Antwoord in UI (nieuw) |
|--------|-------------------|--------------|--------------------|-------------------------|
| **Homepage** | “Wat is dit?” | Snel iets maken | “Waar begin ik?” | Hero CTA “Start creating” + Motion-kaart “Make a video from photos” |
| **Discover** | “Kan ik hier ontdekken?” | Inspiratie / kopen | “Is er een shop?” | Marketplace: “Not open yet — make videos with Motion today” |
| **Create** | “Welke knop?” | Eén duidelijke start | “Motion of Studio?” | “Quick video” vs “Plan a story first” |
| **Studio splash** | “Wat is Studio?” | Verhaal plannen | “Wat doe ik hier?” | 3 stappen + “New storyboard” primair |
| **Workspace** | “Waar ben ik?” | Scène bewerken | “Wat is dit scherm?” | Header: storyboardtitel + “Story editor” |
| **Animate** | “Hoe maak ik video?” | Upload → klaar | “Hoeveel stappen?” | Wizard 1–6 met korte titels |
| **Videos** | “Waar zijn mijn files?” | Terugvinden / afspelen | “Is het klaar?” | Status: “Making your video” / “Ready to watch” |
| **Video detail** | “Wat nu?” | Afspelen, downloaden | “Kan ik tekst wijzigen?” | Quick actions + Version Center link |
| **Mijn verbruik** | “Wat heb ik uitgegeven?” | Kosten snappen | “Waarom credits?” | “What you spent on videos this month” |
| **Login** | “Even inloggen” | Door naar tool | “Heb ik account?” | Duidelijke signup-link ✅ |

### Te veel uitleg

| Locatie | Issue | Actie |
|---------|-------|-------|
| Studio hub (advanced) | Vision + roadmap card | Alleen advanced mode |
| `studio.workspace.classicEditorHint` | Legt panel stack uit | Alleen advanced toggle |
| Landing showcase (3 kaarten) | Herhaling Motion/Studio | OK voor SEO; inkorten body copy |
| Instant step 5 tooltip | “Why motion isn’t magic” | Inklappen achter “?” — OK |
| About page | Lange ecosystem-vision | Behouden voor /about; niet in wizard |

### Te weinig uitleg

| Locatie | Issue | Aanbevolen |
|---------|-------|------------|
| Advanced studio toggle | Onbekend wat het opent | Tooltip: “Shows classic editor and extra tools” (P2) |
| Version center tabs | Verschil original/latest | Tab intro’s ✅ al aanwezig — copy iets korter |
| Credits op pricing | Geen ankerwaarde | “1 credit ≈ one short video render” (P2) |
| Storyboard vs project | Twee woorden voor video | Eén zin op videos page: “Projects are your finished videos” |

### Nieuwe aanbevolen teksten

Zie per-pagina sectie hieronder. **Vet** = geïmplementeerd in deze sprint (i18n).

---

## Per pagina — user journey + concrete vervangingen

### Homepage `/`

| | |
|--|--|
| **Denkt** | “Is dit een app of een bedrijfssite?” |
| **Wil** | Snel video maken of begrijpen wat mogelijk is |
| **Vraag** | “Wat kan ik hier doen?” |

| Element | Oud (EN) | Nieuw (EN) | NL |
|---------|----------|------------|-----|
| Hero headline | The HomeCheff AI production ecosystem | **Make AI videos from your photos and stories** | **Maak AI-video's van je foto's en verhalen** |
| Hero subtext | Plan stories in Studio, render motion… | **Start with a quick video in Motion, or plan a full story in Studio.** | **Begin met een snelle video in Motion, of plan eerst je verhaal in Studio.** |
| Flow step 3 | Render, monitor progress, and recover stuck jobs | **Watch your video being made until it's ready.** | **Volg de voortgang tot je video klaar is.** |
| Highlight 3 | Transparent usage and render analytics | **See what each video cost.** | **Zie wat elke video heeft gekost.** |
| Bottom CTA | Ready to produce your next AI film? | **Ready to make your next video?** | **Klaar om je volgende video te maken?** |

### Discover `/discover`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Marketplace badge | Roadmap | **Coming later** |
| Marketplace title | Creator marketplace & feeds | **Discover other creators** |
| Marketplace body | Public profiles… planned | **We're building a place to share and discover videos. For now, create your own with Motion.** |
| Motion card body | Photo-to-video AI wizard with progress tracking… | **Turn photos into a video in a few steps.** |

### Create `/create`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Title | Choose your production path | **How do you want to start?** |
| Motion body | Upload images, configure the storyboard… | **Best when you want a finished video today.** |
| Studio body | Define characters, scenes, and director intent… | **Best when you want the same characters and scenes in every video.** |

### Studio splash `/studio`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Subtitle | Director workspace, production insights… | **Shape your story scene by scene, then turn it into a video.** |
| Step 2 | Edit scenes in the workspace with Director… | **Edit each scene — what happens, who speaks, and how it looks.** |
| Step 3 | Open Motion to generate… manage versions | **Make your video in Motion, then download or create new versions.** |
| CTA storyboards | Open my storyboards | **My storyboards** |

### Studio workspace `/studio/workspace`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Label | Scene Workspace | **Story editor** |
| Loading | Loading storyboard… | **Loading your story…** |
| Inspector: story health | Story health | **How strong is your story?** |
| Inspector: readiness | Production readiness | **Ready to make video** |
| Inspector: handoff | Handoff readiness | **Ready for Motion** |
| Inspector: QA | QA — composition | **Composition check** |
| Inspector: tight space | …blocking | **Crowded scene — check where people and objects stand.** |
| Missing SB hint | `?storyboardId=` | **Choose a storyboard from your list first.** |
| Assets drawer hint (NL) | Browse assets in de drawer | **Browse characters and locations here →** |

### Studio onboarding (`MotionStudioOnboarding`)

| Step | Oud | Nieuw |
|------|-----|-------|
| step2 | Direct scenes | **Shape your scenes** |
| Title | Your path to a finished video | **Four steps to a finished video** |

### Animate `/animate/instant`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Step 2 desc | This order is sent to the AI | **Drag to set the order of your images.** |
| Step 1 upload | Upload 2 or more images | **Add at least 2 photos** |
| Checkout gate | Text scan still running | **Still checking text in your images** |

### Videos `/videos`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Empty description | Create an animation to see… | **Make your first video — it will show up here.** |
| Create new | Create new animation | **Make a new video** |
| Title | My projects | **My videos** |

### Video detail `/videos/[id]`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Render trace title | How this video was made | ✅ Behouden — goed |
| Status generating | Generating | **Making your video…** |
| Fragments Safari hint | Inline playback can fail… | **On Safari, tap Download if preview doesn't play.** |

### Version center `/videos/[id]/versions`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Lineage title | Version lineage | **Version history** |
| Lineage hint | How versions branch… | **See how edits and new videos relate to your original.** |
| Tab full_rerender intro | Full video re-renders with new AI motion… | **A completely new video using the same photos.** |

### Mijn verbruik `/mijn-verbruik` (HCP)

| Element | Oud | Nieuw |
|---------|-----|-------|
| Label | Billing | **Usage** |
| Intro | Credits, status, and project links per render | **What you spent on videos — with dates and links.** |
| Privacy note | internal provider costs… admin-only | **You only see prices you pay — nothing else on this page.** |
| renderType.conceptRender | Concept render | **Draft video** |

### Pricing `/pricing`

| Element | Oud | Nieuw |
|---------|-----|-------|
| Title | Usage-based production credits | **Simple pay-per-video pricing** |
| Subtitle | bills per render and provider usage… admins | **You buy credits and spend them when you make videos. Sign in to see your balance.** |
| Motion body | segment generation and final merge… provider cost | **Longer or higher-quality videos use more credits.** |

### Login / register

| Element | Oud | Nieuw |
|---------|-----|-------|
| Login subtitle | Log in to continue creating animations | **Log in to make and manage your videos.** |
| Signup subtitle | Create an account to generate animations safely | **Create a free account to get started.** |

### Auth meldingen

| Element | Status |
|---------|--------|
| Invalid credentials, network error | ✅ Al user-friendly |
| Invite errors | ✅ OK voor niche flow |

### Settings / account

Geen dedicated settings-pagina; rol in user bar (`nav.role.*`) — **twijfel**: “Power” → “Pro” (P2).

### Mobile / WebView

| Issue | Actie |
|-------|-------|
| EN “Browse assets in de drawer” (NL file) | **vervangen** |
| Lange inspector labels op smal scherm | Mobile insights sheet ✅ |
| Technische network errors | Workspace error panel ✅ |

---

## Samenvatting implementatie

| Categorie | Aantal keys herschreven (schatting) | Bestanden |
|-----------|-------------------------------------|-----------|
| Studio splash + workspace | ~25 | `en.ts`, `nl.ts` |
| Landing + discover + create | ~15 | `en.ts`, `nl.ts` |
| Pricing + usage | ~10 | `en.ts`, `nl.ts` |
| Videos + versions | ~8 | `en.ts`, `nl.ts` |
| Instant wizard (subset) | ~4 | `en.ts`, `nl.ts` |

## Nog niet herschreven (backlog)

- Volledige `studio.feature.*` hub (advanced only)
- `studio.production.*` provider env-strings (advanced route)
- `usage.renderType.*` enum labels (deels jargon)
- `videos.badge.*` (Story Mode, Transition Mode)
- `landing.showcase.*` bodies (text beats, full rerenders)
- Profielen — nog geen publieke profielpagina

## Test-checklist copy

- [ ] Nieuwe user landt op `/` — begrijpt primaire CTA zonder “ecosystem”
- [ ] `/studio` splash — geen “Director”, “feature grid”, “insights”
- [ ] Workspace — header zegt “Story editor”
- [ ] `/mijn-verbruik` — geen “provider”, “margin”, “admin”
- [ ] `/pricing` — geen admin zin in subtitle
- [ ] NL en EN consistent op gewijzigde keys
