# Motion Studio Pricing & Monetization Audit

Report date: 2026-06-06  
Scope: **audit-only** — no code changes, no pricing changes, no credit changes, no subscriptions, no Stripe changes, no implementations.

**Method:** Live codebase (`main` @ `25ebbba`) + `docs/motion-studio-economics-audit.md` + provider documentation (OpenAI, ElevenLabs, Vidu, Stripe, competitors).  
**Rule:** Every conclusion tagged **VERIFIED** (in code or provider docs), **DERIVED** (computed from verified inputs), or **UNKNOWN** (not instrumented or not published).

---

## Feature Inventory

| Feature | Provider(s) | API / mechanism | Provider called? | Provider cost? | Cost tracked in app? |
|---------|-------------|-----------------|------------------|----------------|----------------------|
| **Character CRUD** | PostgreSQL, Vercel Blob | Prisma + blob upload | No | No | No |
| **Character reference upload** | Vercel Blob | `@vercel/blob` | No | Storage only | Partial (`storage_upload`) |
| **Character reference analysis** | OpenAI | `gpt-4o-mini` chat + image URLs | Yes (optional) | Yes | **No** |
| **Prop CRUD** | PostgreSQL, Blob | Prisma | No | No | No |
| **Location CRUD** | PostgreSQL, Blob | Prisma | No | No | No |
| **World CRUD** | PostgreSQL, Blob | Prisma | No | No | No |
| **Canonical references** | PostgreSQL | Prisma JSON | No | No | No |
| **Project memory** | PostgreSQL | Prisma | No | No | No |
| **Storyboard CRUD** | PostgreSQL | Prisma | No | No | No |
| **Scene CRUD / reorder / duplicate** | PostgreSQL | Prisma | No | No | No |
| **Prompt generation** | — | In-process (`studio-scene-image-prompt`) | No | No | No |
| **Director proposal** | — | Client heuristic (`studio-director-proposal`) | No | No | No |
| **Director apply** | PostgreSQL | N scene PATCH APIs | No | No | No |
| **Scene image generation** | OpenAI | `dall-e-3` `/v1/images/generations` | Yes | Yes | **No** (planning €0.04 only) |
| **Scene image regen** | OpenAI | Same | Yes | Yes | **No** |
| **Scene image corrections regen** | OpenAI | Same + correction patches | Yes | Yes | **No** |
| **Bulk scene images** | OpenAI | N sequential DALL·E calls | Yes | Yes | **No** |
| **Scene vision QA** | OpenAI | `gpt-4o-mini` multi-image | Yes | Yes | **No** |
| **Scene consistency analyze** | — | In-process scoring | No | No | No |
| **Storyboard vision analyze** | OpenAI | `gpt-4o-mini` | Yes | Yes | **No** |
| **Character consistency analyze** | — | In-process | No | No | No |
| **Voice marketplace browse** | ElevenLabs | `GET /v1/shared-voices`, `GET /v1/voices` | Yes (metadata) | **No** (metadata) | No |
| **Voice catalog to client** | — | ~12k voices JSON payload | Indirect | Bandwidth | No |
| **Voice preview (catalog URL)** | ElevenLabs CDN | Play `previewUrl` | No API | No | No |
| **Voice preview (TTS)** | ElevenLabs, Blob | `POST /v1/text-to-speech/{id}` | Yes | Yes | **No** |
| **Voice preview draft** | ElevenLabs, Blob | TTS + new UUID blob | Yes | Yes | **No** |
| **Storyboard voice / narration** | ElevenLabs, Blob | TTS per language asset | Yes | Yes | **No** |
| **Voice clone (character)** | ElevenLabs, Blob | `POST /v1/voices/add` + auto TTS preview | Yes | Yes | **No** |
| **Voice clone (standalone)** | ElevenLabs | `POST /api/studio/voice-clones` | Yes | Yes | **No** |
| **Voice history** | PostgreSQL | Audit rows | No | No | No |
| **Subtitles transcribe** | ElevenLabs | `POST /v1/speech-to-text` | Yes | Yes | **No** |
| **Audio library** | Blob / static | Upload + catalog | Storage only | Storage | No |
| **Motion handoff** | PostgreSQL | 3× storyboard fetch | No | DB only | No |
| **Motion render (transition)** | Vidu | `POST /ent/v2/start-end2video` × N | Yes | Yes | **Yes** (balance delta) |
| **Motion render (story)** | Vidu | `POST /ent/v2/multiframe` × 1 | Yes | Yes | **Yes** |
| **Motion render (action chain)** | Vidu | Multiple start-end jobs | Yes | Yes | **Yes** |
| **Premium / Instant Premium** | Vidu, OpenAI OCR, Google Vision | Same + OCR pipeline | Yes | Yes | Partial (Vidu exact; OCR estimated) |
| **Language export** | OpenAI?, worker FFmpeg | Translation + merge | Partial | Partial | **$0** in cost events |
| **Text rerender** | Worker FFmpeg | Merge only | No provider | Negligible | **$0** in cost events |
| **Full export / download** | Blob egress | HTTP download | No | Egress | No |
| **Full rerender** | Vidu | Re-motion entire project | Yes | Yes | **Yes** (Vidu) |
| **Identity consumption A+B** | — | Prompt packing only | No | No | No |
| **Stripe checkout** | Stripe | Checkout Sessions | Yes | Stripe fees | No COGS event |

**VERIFIED:** Provider mapping from `docs/motion-studio-economics-audit.md` and `src/app/api/studio/**`.  
**UNKNOWN:** Exact provider per storyboard job type at runtime without production logs.

---

## Cost Per Action

Assumptions for USD↔EUR: **DERIVED** default FX **1.08** from `src/server/provider-cost/margin-simulation.ts`.

### Voice preview (TTS click)

| Component | Amount | Tag |
|-----------|--------|-----|
| ElevenLabs TTS (Flash/Turbo) | **$0.05 / 1,000 chars** | **VERIFIED** — [elevenlabs.io/pricing/api](https://elevenlabs.io/pricing/api) |
| Code planning estimate | `ceil(chars/500)` × **€0.02** | **VERIFIED** — `elevenlabs-voice.ts`, `studio-production-costs.ts` |
| Typical preview (~200 chars) | **~$0.01** provider; planning **€0.02** | **DERIVED** |
| Blob upload | ~50–200 KB; **~$0.000002/mo** storage | **DERIVED** — `blob-storage-pricing.ts` |
| DB | 0–1 read | **UNKNOWN** |
| Infra | Amortized **UNKNOWN** | **UNKNOWN** |
| **Total (typical)** | **~$0.01–0.02** | **DERIVED** |
| User price | **€0** (unmetered) | **VERIFIED** |

### Voice clone

| Component | Amount | Tag |
|-----------|--------|-----|
| ElevenLabs `voices/add` (IVC) | **Not flat-published** in app; Vidu lists clone at **30 cr = $1.50** (Vidu Audio, not ElevenLabs) | **UNKNOWN** ElevenLabs clone $ — not in codebase |
| Mandatory auto-preview TTS | +1 TTS call | **VERIFIED** — `create-user-voice-clone.ts` |
| Blob (samples + manifest) | ~1–5 MB permanent | **DERIVED** |
| **Total** | **UNKNOWN** ElevenLabs; **≥2 API calls** | **VERIFIED** call count |

### Character / scene image (DALL·E 3, 1024×1024 standard)

| Component | Amount | Tag |
|-----------|--------|-----|
| OpenAI image | **$0.04 / image** | **VERIFIED** — [OpenAI pricing](https://developers.openai.com/api/docs/models/dall-e-3) |
| Code planning | **€0.04 / image** | **VERIFIED** — `PRODUCTION_COST_CONSTANTS.eurPerImage` |
| Blob | ~200 KB–1 MB | **DERIVED** |
| DB (`StudioSceneImage` + JSON reports) | Large row | **VERIFIED** schema pattern |
| **Total** | **~$0.04 + storage** | **DERIVED** |
| User price | **€0** (Studio) | **VERIFIED** |

### Character reference analysis

| Component | Amount | Tag |
|-----------|--------|-----|
| OpenAI `gpt-4o-mini` vision (≤5 images) | **UNKNOWN** exact $; token-based | **UNKNOWN** |
| Heuristic | Similar order to OCR **~$0.01–0.03** | **DERIVED** |

### Scene vision QA / consistency vision

| Component | Amount | Tag |
|-----------|--------|-----|
| OpenAI multi-image chat | **UNKNOWN**; scales with regens | **UNKNOWN** |

### Motion render — transition (standard preset, 1 segment)

| Component | Amount | Tag |
|-----------|--------|-----|
| Vidu credits | **5s × 12 cr/s = 60 cr** | **VERIFIED** — `animation-presets.ts` |
| Vidu USD | **60 × $0.005 = $0.30** | **VERIFIED** — `CREDIT_USD` + [Vidu pricing](https://platform.vidu.com/docs/pricing) |
| Vidu official Q3-turbo 720p | **11 cr/s → $0.055/s → $0.275/5s** | **VERIFIED** provider; **DERIVED** delta vs code estimate |
| Blob segment MP4 | ~2–10 MB | **DERIVED** |
| DB / worker | Ledger + usage log | **VERIFIED** |
| **Total (code basis)** | **~$0.30** | **DERIVED** |

### Motion render — standard project (5 images, 4 transitions)

| Component | Amount | Tag |
|-----------|--------|-----|
| Vidu credits | **4 × 5 × 12 = 240 cr** | **VERIFIED** |
| Vidu USD | **$1.20** | **DERIVED** |
| Customer EUR (transition tier) | **€1.99–€2.99** | **VERIFIED** — `video-pricing-config.ts` |
| Gross margin (Vidu only) | **~45–60%** at €2.99 @ 1.08 FX | **DERIVED** |

### Motion render — story multiframe (N scenes)

| Component | Amount | Tag |
|-----------|--------|-----|
| Vidu segments | **min(N−1, 9)** per Vidu docs | **VERIFIED** — [Vidu pricing multiframe note](https://platform.vidu.com/docs/pricing) |
| Per-segment cost | Model/resolution dependent | **VERIFIED** pricing tables; **UNKNOWN** exact mapping in prod env |
| Code duration estimate | `sum(scene durations) + (scenes−1)` × **€0.012/s** | **VERIFIED** — `studio-production-costs.ts` |

### Language export

| Component | Amount | Tag |
|-----------|--------|-----|
| OpenAI translation | Heuristic **$0.000002/token** | **VERIFIED** — `translate-language-text.ts`; not in cost events |
| FFmpeg merge | **$0.001** estimate | **VERIFIED** — `render-analytics-cost.ts` |
| Customer price | **€0.99** flat | **VERIFIED** |
| **Total COGS** | **UNKNOWN** (translation volume-dependent) | **UNKNOWN** |

### Text rerender

| Component | Amount | Tag |
|-----------|--------|-----|
| Provider | Worker FFmpeg only | **VERIFIED** |
| Logged COGS | **$0** | **VERIFIED** — `cost-event-types.ts` |
| Customer price | **€0.49** | **VERIFIED** |

### Full export

| Component | Amount | Tag |
|-----------|--------|-----|
| Provider | Blob egress | **DERIVED** ~$0.15/GB |
| Customer price | **€0.49** default | **VERIFIED** |

### Director / prompt / identity consumption

| Component | Amount | Tag |
|-----------|--------|-----|
| All | **$0** provider | **VERIFIED** — in-process heuristics |

### Voice marketplace catalog load

| Component | Amount | Tag |
|-----------|--------|-----|
| ElevenLabs metadata | **0–2 calls/hour/user** (1h cache) | **VERIFIED** |
| Bandwidth to client | **~12k voices JSON** | **VERIFIED** — economics audit |
| Provider $ | **$0** for metadata | **VERIFIED** |

---

## Cost Per Project

Baseline assumptions (all **DERIVED** unless noted):

- **1 DALL·E image / scene** @ **$0.04** (**VERIFIED** OpenAI + code constant).
- **Narration ~80 chars/scene** → ElevenLabs Flash **$0.05/1K chars** (**VERIFIED**).
- **Motion:** story-style duration model from `estimateVideoDurationSeconds`; Vidu COGS via **€0.012/s** planning constant (**VERIFIED** code) — actual Vidu multiframe may differ (**UNKNOWN**).
- **1 voice pass** per project (storyboard narration).
- **0 regens** (happy path); regens multiply OpenAI cost linearly.
- **Storage:** ~0.5 MB/scene image + ~8 MB final video ≈ negligible month-1 (**DERIVED**).
- **DB:** **UNKNOWN** per project $.
- **Infra:** **$20/mo baseline** in analytics (**VERIFIED**); per-project amortization **UNKNOWN**.

### Kleine video — 3 scènes

| Cost bucket | Estimate | Tag |
|-------------|----------|-----|
| OpenAI (3 images) | **$0.12** | DERIVED |
| ElevenLabs (240 chars narration) | **~$0.012** | DERIVED |
| Vidu (17s × €0.012 ≈ $0.20 planning) | **~$0.20** | DERIVED |
| Storage | **<$0.01** | DERIVED |
| Database | **UNKNOWN** | UNKNOWN |
| **Totaal COGS (tracked + planning)** | **~$0.33–0.40** | DERIVED |
| Customer motion price (if exported) | **€0.99–€1.99** (80–120 cr transition tier) | VERIFIED |
| **Marge nodig (50% net target)** | **≥€1.00 omzet** bij €0.35 COGS | DERIVED |

### Gemiddelde video — 10 scènes

| Cost bucket | Estimate | Tag |
|-------------|----------|-----|
| OpenAI (10 images) | **$0.40** | DERIVED |
| ElevenLabs (800 chars) | **~$0.04** | DERIVED |
| Vidu (59s × €0.012 ≈ $0.71 planning) | **~$0.71** | DERIVED |
| Storage | **~$0.02** | DERIVED |
| Database | **UNKNOWN** | UNKNOWN |
| **Totaal COGS** | **~$1.15–1.30** | DERIVED |
| Customer motion price (story tier) | **€2.99–€4.99** (0–600 cr story tiers) | VERIFIED |
| **Marge nodig** | **≥€2.50 omzet** | DERIVED |

### Grote video — 25 scènes

| Cost bucket | Estimate | Tag |
|-------------|----------|-----|
| OpenAI (25 images) | **$1.00** | DERIVED |
| ElevenLabs (2000 chars) | **~$0.10** | DERIVED |
| Vidu (149s × €0.012 ≈ $1.79 planning; multiframe max 9 segments) | **~$1.79–3.00+** | DERIVED + **UNKNOWN** segment cap handling |
| Storage | **~$0.05** | DERIVED |
| Database | **UNKNOWN** (large JSON) | UNKNOWN |
| **Totaal COGS** | **~$2.90–4.50+** | DERIVED |
| Customer motion price | **€6.99–€9.99+** (601–900+ cr story tiers) | VERIFIED |
| **Marge nodig** | **≥€5.50 omzet** | DERIVED |

**Critical gap:** Studio image + voice COGS (**~$0.50–1.10** on 10-scene project) are **not billed** and **not in margin dashboards** — **VERIFIED**.

---

## Credit Economics

### Two “credit” systems in codebase (**VERIFIED**)

1. **Vidu provider credits** — `$0.005/credit`; drives usage limits + customer EUR tiers.
2. **ElevenLabs planning credits** — `ceil(chars/500)` × €0.02; **not** a user wallet.

There is **no unified Studio credit wallet** for DALL·E / TTS / motion — **VERIFIED** (no schema or checkout for studio credits).

### Per-action audit

| Feature | Huidige “credits” / price | Werkelijke kosten | Equivalent € | Marge | Risico |
|---------|---------------------------|-------------------|--------------|-------|--------|
| Motion render (~240 cr) | Usage cap only; sale **€1.99–€2.99** | **$1.20** Vidu | **~€1.11** | **~40–55%** gross Vidu-only | Low if metered |
| Scene image | **Free** | **$0.04** | **€0.04** | **N/A (−100%)** | **High** — regen loops |
| Voice preview TTS | **Free** | **~$0.01/click** | **€0.01** | **N/A** | **High** — spam |
| Voice clone | **Free** | **UNKNOWN** + 2 calls | **UNKNOWN** | **N/A** | **High** |
| Storyboard voice | **Free** | **$0.05/1K chars** | variable | **N/A** | Medium |
| Director / prompts | **Free** | **$0** | **€0** | ∞ | Low |
| Language export | **€0.99** | **UNKNOWN** translation | **€0.05–0.30?** | **Unknown** | Medium |
| Text rerender | **€0.49** | **~$0.001** | **€0.001** | **~99%** | Low |
| Full export | **€0.49** | Egress only | **<€0.01** | **~98%** | Low |
| Vision QA | **Free** | **UNKNOWN** OpenAI | **UNKNOWN** | **N/A** | Medium |
| OCR (Instant Premium) | In video price | **$0.012** est. | **€0.01** | Small | Low |
| Marketplace browse | **Free** | **$0** API | **€0** | N/A | Bandwidth |

### Ondergeprijsde features (**VERIFIED** free + provider cost)

- Scene image generation / regen  
- Voice preview TTS  
- Voice clone  
- Vision QA  
- Bulk scene images  

### Overgeprijsde features (**DERIVED**)

- Text rerender (**€0.49** vs **~$0.001** COGS) — acceptable if positioned as convenience fee  
- Full export (**€0.49** vs egress) — high margin by design  

### Gratis features die geld kosten (**VERIFIED**)

All Studio asset + voice features above.

### Premium features die te goedkoop zijn (**DERIVED**)

- Story mode top tier **€9.99 + overflow** vs 25-scene **$2.90–4.50+** Vidu-only COGS — acceptable until heavy regen/voice; **UNKNOWN** at abuse scale  
- **Pro preset** (420 cr ≈ **$2.10**) with **power** role access — COGS not recovered if motion sold at low tier  

---

## Subscription Modeling

**Current state:** Roles `user` / `power` / `admin` with usage caps — **no Stripe subscription** — **VERIFIED** (`usage-limits.ts`, no subscription webhook).

| Scenario | Voordelen | Nadelen | Risico | Marge | Schaalbaarheid |
|----------|-----------|---------|--------|-------|----------------|
| **A — Credits-only** (no subscription) | Simple; pay-per-render aligns with Vidu COGS | No recurring revenue; Studio free tier leaks | TTS/image abuse | Per-transaction | Poor LTV |
| **B — Subscription + credits** | Recurring revenue; credits cap abuse | Complex UX; two currencies | Credit confusion | Higher if subs > COGS | Good |
| **C — Subscription inclusive credits** | Predictable for users (HeyGen/Runway model) | Must size credits vs caps; rollover policy | Under-priced tiers | Medium | **Best fit** at scale |
| **D — Freemium** | Acquisition; try Director/storyboards | Highest leak surface (previews, images) | **Critical** without hard gates | Negative on free | Needs strict limits |

**Recommendation direction (advisory only):** **Scenario C** with **Scenario B** top-ups — aligns with competitor norms (HeyGen, Runway) — **DERIVED** from competitive section.

---

## User Economics

Role mapping (**VERIFIED**): `user` ≈ hobby; `power` ≈ active/power; no `studio` role in code.

Assumptions: standard preset **240 cr/video**; **1×** happy-path Studio COGS per video as in Cost Per Project; motion sold at **€2.49** average (**DERIVED**).

| Persona | Maandelijks gebruik | Provider COGS (planning) | Credits (Vidu cap) | Benodigde omzet | Geschatte marge |
|---------|---------------------|--------------------------|--------------------|-----------------|-----------------|
| **Hobby** | 5 videos, 3 scenes, 2 regens | **~$2.50** (motion $6 + studio $0) | 3000 cr cap → **12 videos max** | **€12.50** @ €2.50/vid | **~50%** motion-only; **UNKNOWN** studio leak |
| **Kleine creator** | 15 videos, 5 scenes | **~$18** | Hits **3000 cr** @ ~12 vids | **€37.50** | Caps bind before video cap — **VERIFIED** |
| **Actieve creator** | 40 videos (needs power role) | **~$55+** | 20,000 cr | **€100** | **UNKNOWN** without studio metering |
| **Power user** | 150 videos/mo cap | **~$180** Vidu | 20,000 cr ≈ **83 videos** | **€375** | Video cap binds first — **VERIFIED** |
| **Studio gebruiker** | 20 storyboards, 10 scenes, heavy voice | **~$40–80** studio + **~$30** motion | Not modeled | **€150+** | **Negative risk** without studio pricing |

**UNKNOWN:** Real distribution of regens, previews, clones per persona — no production analytics in codebase.

---

## In-App Purchase Opportunities

Advisory packs (not implementing). Prices sized for **≥50% gross margin** on provider COGS — **DERIVED**.

| Pack | Logisch? | Geschikte prijs (EUR) | Credit equivalent | Verwachte marge | Tag |
|------|----------|----------------------|-------------------|-----------------|-----|
| **Voice clone pack** (3 clones) | Yes | **€9.99** | 150 “studio credits” | **UNKNOWN** COGS | UNKNOWN $ |
| **Premium render pack** (5× pro renders) | Yes | **€24.99** | 2100 Vidu cr value | **~50%** @ $2.10/render | DERIVED |
| **Extra motion credits** (500 cr) | Yes | **€4.99** | 500 Vidu cr | **~50%** ($2.50 COGS) | DERIVED |
| **Language export pack** (10×) | Yes | **€7.99** | — | **High** if translation light | DERIVED |
| **Character/scene image pack** (50 images) | Yes | **€4.99** | 50 × $0.04 = $2 COGS | **~60%** | DERIVED |
| **Scene regeneration pack** (25 regens) | Yes | **€3.99** | — | **~50%** @ $0.04/img | DERIVED |
| **Voice preview bundle** (100 previews) | Abuse mitigation | **€2.99** | Cap 100 TTS | **~40%** @ $0.01 | DERIVED |

---

## Provider Risk Analysis

| Provider | Prijswijziging | Afhankelijkheid | Rate limits | Compliance | SaaS/OEM | Marktplaats |
|----------|----------------|-----------------|-------------|------------|----------|-------------|
| **OpenAI** | Medium — DALL·E 3 **$0.04** today; GPT Image migration possible | **High** — scene images + vision | Gate exists (`openai-request-gate`) | Services Agreement; resale of outputs **UNKNOWN** | API SaaS OK | N/A |
| **ElevenLabs** | Medium — TTS cut 55% in 2025 blog | **High** — voice core | **UNKNOWN** in code | **OEM terms**: Free–Pro UI tiers **cannot** embed marketplace — **VERIFIED** economics audit | **Business/OEM required** for embedded 12k marketplace | **Critical** — shared voices + TTS |
| **Vidu** | Low — **$0.005/cr** stable; Nov 2025 10× denomination | **Critical** — motion core | Job polling; **UNKNOWN** hard limits | API ToS allow commercial use; plan tier **UNKNOWN** | API reseller OK | N/A |
| **Stripe** | Low | Medium — checkout only | N/A | Standard | N/A | N/A |
| **Google Vision** | Low | Low — OCR fallback | **UNKNOWN** | GCP ToS | N/A | N/A |
| **Vercel Blob** | Medium | High — all media | N/A | Standard | N/A | N/A |

**Voice marketplace risk:** Embedding ElevenLabs shared catalog in SaaS without OEM agreement — **VERIFIED** terms conflict — legal review required before scale.

---

## Abuse & Fraud Analysis

| Abuse vector | Wie kost het meest | Provider impact | Kostenimpact | Bescherming (bestaand / mogelijk) |
|--------------|-------------------|-----------------|--------------|-----------------------------------|
| **Voice preview spam** | Explorer / bot | ElevenLabs TTS | **$0.01+/click** × unlimited | **None** (no dedup) — **VERIFIED** |
| **Clone spam** | Power user | ElevenLabs IVC + TTS | **UNKNOWN** × N | Auth only — **VERIFIED** |
| **Mass scene regen** | Studio user | OpenAI DALL·E | **$0.04/regen** | No cache — **VERIFIED** |
| **Mass vision QA** | Quality chaser | OpenAI chat vision | **UNKNOWN** | No gate — **VERIFIED** |
| **Motion rerender loop** | Impatient creator | Vidu | **$1.20+/render** | Usage caps — **VERIFIED** |
| **Language export loop** | Localization tester | OpenAI + worker | Low–medium | Worker RUNNING guard — **VERIFIED** |
| **Catalog bandwidth** | Any user | Egress | **Medium** at scale | 1h cache — **VERIFIED** |
| **Role cap bypass** | Compromised admin | All | Unlimited | Admin cap 999999 — **VERIFIED** |

**Highest-risk user profile (DERIVED):** Authenticated **power** user running Studio storyboards with heavy TTS previews + scene regens + moderate motion — **COGS mostly untracked**.

---

## Margin Analysis

EUR prices **VERIFIED** (`video-pricing-config.ts`). Provider cost **VERIFIED** where noted.

| Feature | Provider kost | Verkoopprijs | Brutomarge | Nettomarge | Risico | Prioriteit |
|---------|---------------|--------------|------------|------------|--------|------------|
| Motion transition 240cr | **$1.20** | **€2.49** avg | **~55%** | **UNKNOWN** | Low | P1 — core |
| Motion story 450cr | **~$2.25** est. | **€4.99** | **~50%** | **UNKNOWN** | Medium | P1 |
| Text rerender | **~$0.001** | **€0.49** | **~99%** | High | Low | P3 |
| Language export | **UNKNOWN** | **€0.99** | **UNKNOWN** | **UNKNOWN** | Medium | P2 |
| Full export | **~$0.01** | **€0.49** | **~98%** | High | Low | P3 |
| Scene image | **$0.04** | **€0** | **−100%** | **−100%** | **High** | **P0** |
| Voice preview | **~$0.01** | **€0** | **−100%** | **−100%** | **High** | **P0** |
| Voice clone | **UNKNOWN** | **€0** | **UNKNOWN** | **UNKNOWN** | **High** | **P0** |
| Director | **$0** | **€0** | N/A | N/A | Low | P4 |
| Instant Premium OCR | **~$0.012** | In bundle | Small | **UNKNOWN** | Low | P2 |

---

## Competitive Positioning

Public pricing as of 2026-06-06. Motion Studio = **Vidu transitions + Studio pipeline + ElevenLabs voice** — **VERIFIED** product composition.

| Competitor | Prijsmodel | Credits | Abonnement | Free tier | Premium | Sterk vs MS | Zwak vs MS |
|------------|------------|---------|------------|-----------|---------|-------------|------------|
| **Canva** | Shared AI allowance | Opaque pool | Pro **~$13/mo** | 5 lifetime videos | Ultra AI 20/mo Pro | Brand, distribution | No storyboard/director depth |
| **CapCut** | Freemium + Pro | Pro credits | **~$10/mo** region-dependent | Watermark free | Pro features | Mobile, templates | **UNKNOWN** exact API costs |
| **InVideo** | Credits + plans | AI credits/mo | From **~$25/mo** | Limited | Business tiers | Templates | Less custom identity |
| **Pika** | Subscription + credits | Gen credits | **~$10–35/mo** | Daily credits | Higher tiers | Fast clip gen | No full studio asset system |
| **Runway** | Credit pool | 625–9500/mo | **$12–76/mo** | 125 one-time | Unlimited explore | Model breadth | Higher $/second (10 cr/s Gen-3) |
| **HeyGen** | Credit-based | 600–150k/mo | **$29–149/mo** | 3 videos/mo | Business packs **$0.05/cr** | Avatar focus | Different motion model |
| **ElevenLabs** | Chars + subscription | API PAYG | **$5/1K chars** Flash | Limited free | Business/OEM | Voice quality | Not full video studio |
| **Vidu tools** | Vidu credits | **$0.005/cr** | PAYG | Platform-dependent | Q3 tiers | Same engine | MS adds HomeCheff stack |

**Motion Studio differentiation (VERIFIED in codebase):** Universal assets, identity system, director heuristics, canonical refs, storyboards → motion handoff — competitors rarely combine all — **DERIVED** positioning statement.

**Pricing gap (DERIVED):** MS charges **per video export** (€0.99–9.99) while competitors use **monthly credit pools** — MS lacks recurring subscription despite having role caps.

---

## Recommended Pricing Model

**Advisory only — not implementing.**

| Tier | Prijs (EUR/mo) | Included | Limieten | Features | Target marge |
|------|----------------|----------|----------|----------|--------------|
| **Free** | **€0** | 1 storyboard, 3 scene images, 5 catalog previews (cached) | No motion export; watermark | Director, browse voices | **Loss-leader** — hard caps |
| **Creator** | **€19** | **800 Vidu cr** + **30 scene images** + **20 TTS previews** | 10 videos/mo; basic+standard presets | Voice select, storyboard, export | **~55%** DERIVED |
| **Pro** | **€49** | **2,500 Vidu cr** + **100 images** + **3 clones/mo** | 30 videos; all presets | Vision QA gated, language export 5× | **~60%** DERIVED |
| **Studio** | **€99** | **6,000 Vidu cr** + **300 images** + **10 clones** | 75 videos; power limits | Priority, team 3 seats | **~58%** DERIVED |
| **Enterprise** | **Custom** | OEM ElevenLabs path, SLA | Custom | SSO, admin analytics | **Negotiated** |

Aligns role caps (`user`/`power`) to commercial tiers — **DERIVED** from `usage-limits.ts` mismatch fix.

---

## Recommended Credit Model

**Advisory — dual ledger:**

1. **Vidu credits** (provider-aligned, **$0.005**) — motion renders only — **VERIFIED** basis.
2. **Studio credits** (customer-facing) — map to:
   - 1 studio credit = **1 scene image** ($0.04 COGS) → sell at **€0.10** (60% margin) — **DERIVED**
   - 1 studio credit = **500 TTS chars** (ElevenLabs $0.025) → sell at **€0.05** — **DERIVED**
   - 1 studio credit = **1 voice preview** — **DERIVED**

**Rollover:** 1 month on monthly plans (match HeyGen) — **DERIVED** best practice.

**Do not** conflate with Vidu credits in UI — **VERIFIED** current confusion risk (two planning systems exist).

---

## Immediate Wins

Top 20 profit improvements (**audit ranking**; savings = order-of-magnitude).

| # | Win | Impact | Moeilijkheid | Besparing | ROI |
|---|-----|--------|--------------|-----------|-----|
| 1 | Meter + bill scene images (studio credits) | **High** | Medium | **$0.04/regen stopped abuse** | **High** |
| 2 | TTS preview dedup/cache | **High** | Low | **~70% preview COGS** | **Very high** |
| 3 | Log DALL·E + ElevenLabs to `ProviderCostEvent` | **High** | Low | Visibility → pricing | **High** |
| 4 | Gate free tier: no motion without payment | **High** | Low | Stops Vidu leak | **High** |
| 5 | Cap voice previews per day/role | **High** | Low | Abuse stop | **High** |
| 6 | Scene image prompt-hash cache | **High** | Medium | **~30–50% OpenAI** | High |
| 7 | Optional skip clone auto-preview | Medium | Low | 1 TTS/clone | Medium |
| 8 | Align 3000 cr/mo cap to 30 videos messaging | Medium | Low | Churn reduction | Medium |
| 9 | ElevenLabs OEM compliance review | **Critical risk** | Medium | Legal | **Blocking scale** |
| 10 | Stripe webhook + subscription SKUs | **High** | Medium | Recurring revenue | High |
| 11 | Server-side voice filter (no 12k client) | Medium | High | Bandwidth | Medium |
| 12 | Vision QA opt-in only | Medium | Low | OpenAI savings | Medium |
| 13 | Transition blob cleanup default-on | Medium | Low | Storage | Medium |
| 14 | Motion handoff single DB query | Low | Low | DB | Medium |
| 15 | Language export cost wiring | Low | Low | Analytics | Low |
| 16 | Price voice clone as IAP | **High** | Medium | Revenue | High |
| 17 | Pro preset only on Pro tier | Medium | Low | Vidu exposure | Medium |
| 18 | Off-peak Vidu for non-urgent | Medium | Medium | **~50% Vidu** | High |
| 19 | Bundle studio+motion in checkout | Medium | Medium | AOV | Medium |
| 20 | Admin COGS dashboard (all providers) | High | Medium | Decision quality | High |

---

## Long-Term Strategy

Per-user infra **UNKNOWN**; provider bottlenecks **DERIVED** from cost structure.

| Scale | Users | Dominant COGS | Bottleneck provider | Hard-scaling cost | Risks |
|-------|-------|---------------|---------------------|-------------------|-------|
| **100** | Low | Vidu + untracked OpenAI | None | Blob **<$5/mo** | ElevenLabs terms |
| **1,000** | Medium | Vidu **~$1.2k–3k/mo** if 1 vid/user | Vidu rate limits | Blob **~$50–150/mo** | TTS preview abuse |
| **10,000** | High | Vidu **~$12k–30k/mo** | **Vidu** + ElevenLabs | Blob **~$500–2k/mo** | OEM, margin compression |
| **100,000** | Very high | **Vidu** + **ElevenLabs** | Both; DB JSON size | Blob **~$5k–20k/mo** | Compliance, support, fraud |

**Fastest-scaling costs (VERIFIED drivers):**

1. **Vidu credits** — linear per render — metered.  
2. **ElevenLabs TTS** — linear per char — **not metered**.  
3. **OpenAI DALL·E** — linear per image — **not metered**.  
4. **Blob storage** — linear per retained asset — partial cleanup.  
5. **PostgreSQL JSON** — superlinear with scene history — **VERIFIED** 69 Json columns.

**Bottleneck at 10k+ users:** **ElevenLabs** (contract + volume) before **Vidu** (technical) — **DERIVED** from terms audit + unmetered TTS.

---

## Executive Summary

### Huidige staat (**VERIFIED**)

Motion Studio has a **mature Vidu billing spine** (credit tiers, EUR pricing, balance-delta logging, margin floors 25–30%) but **monetizes only motion exports and flat add-ons**. The full Studio surface — **DALL·E scene images, ElevenLabs TTS/previews/clones, vision QA** — is **free to users** and **absent from `ProviderCostEvent`**, making true profitability **UNKNOWN** at Studio-heavy usage.

### Kernbevindingen

| # | Bevinding | Tag |
|---|-----------|-----|
| 1 | **Vidu = largest tracked COGS** (~$1.20 per standard video) | VERIFIED |
| 2 | **Studio adjacency costs often exceed motion** on 10+ scene projects | DERIVED |
| 3 | **No subscription product** — only `user`/`power` role caps | VERIFIED |
| 4 | **ElevenLabs OEM risk** blocks marketplace scale | VERIFIED |
| 5 | **Credit cap (3000/mo) binds before video cap (30)** for `user` role | VERIFIED |
| 6 | **TTS preview = highest unmetered leak** | VERIFIED |
| 7 | Competitors use **monthly credit pools**; MS uses **per-export EUR** | VERIFIED + DERIVED |

### Strategisch advies (niet implementeren)

1. Introduce **subscription + dual credits** (Vidu + Studio).  
2. **Meter gratis features** die providerkosten hebben vóór schaal.  
3. Resolve **ElevenLabs OEM** before marketing voice marketplace.  
4. Keep **Vidu pricing engine** — do not rebuild (**VERIFIED** in economics audit).  
5. Target **≥50% gross margin** on bundled project economics, not Vidu line-item alone.

---

## What Should NOT Be Rebuilt

| System | Reason | Tag |
|--------|--------|-----|
| Vidu provider + balance-delta logging | Works; exact when API available | VERIFIED |
| EUR credit-tier pricing V1 | Centralized; margin floors | VERIFIED |
| Progressive voice library + debounced search | Recently optimized | VERIFIED |
| Director heuristic (no LLM) | $0 COGS; adequate v1 | VERIFIED |
| Identity consumption Phase A/B | Quality without extra providers | VERIFIED |
| Custom auth session | No OAuth dependency | VERIFIED |
| FFmpeg / merge worker | Low COGS; logged | VERIFIED |
| Studio prompt builder | In-process; no provider | VERIFIED |
| Provider registry (planned vs live) | Correct separation | VERIFIED |

**Do rebuild (economics layer only, not providers):** unified COGS instrumentation, studio credit wallet, subscription SKUs, abuse gates — **DERIVED** from gaps above.

---

## Validation

- **No code modified**  
- **No pricing / credits / subscriptions / Stripe changed**  
- **No implementations proposed as code**  
- Facts tied to codebase @ `25ebbba` and provider docs fetched 2026-06-06  
- All gaps marked **UNKNOWN**  
- Builds on `docs/motion-studio-economics-audit.md`

---

*End of Motion Studio Pricing & Monetization Audit.*
