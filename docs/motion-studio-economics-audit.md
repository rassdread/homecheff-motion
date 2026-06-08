# Motion Studio Economics Audit

Report date: 2026-06-06  
Scope: **audit-only** — no code changes, no pricing changes, no provider replacements.

**Method:** Live codebase inspection (`main` @ `25ebbba`) + hardcoded billing constants + provider documentation URLs.  
**Rule:** Facts marked **Verified** (in code/docs), **Derived** (computed from verified constants), or **Unknown** (not instrumented).

---

## Provider Inventory

### Live external providers (verified in code)

| Provider | Category | Primary use | Key endpoints / APIs | Core files |
|----------|----------|-------------|----------------------|------------|
| **OpenAI** | AI / image / vision | Scene stills (DALL·E), OCR fallback, preflight vision, Studio QA vision, character ref analysis, translation | `/v1/images/generations`, `/v1/chat/completions`, `/v1/models` | `src/server/scene-image-providers/openai-provider.ts`, `src/server/image-text-detection/openai-vision-provider.ts`, `src/server/studio-vision-providers/openai-vision-provider.ts`, `src/lib/translate-language-text.ts` |
| **Google Cloud Vision** | AI / OCR | Primary baked-text OCR (Instant Premium) | `vision.googleapis.com/v1/images:annotate` | `src/server/image-text-detection/google-vision-provider.ts` |
| **ElevenLabs** | Voice | TTS, STT, voice clone, voice catalog (account + shared voices) | `/v1/text-to-speech/{id}`, `/v1/speech-to-text`, `/v1/voices`, `/v1/voices/add`, `/v1/shared-voices` | `src/lib/elevenlabs-voice.ts`, `src/lib/elevenlabs-voice-clone.ts`, `src/lib/studio-voice-library-catalog.ts` |
| **Vidu** | Motion / video | Transition (`start-end2video`) + story (`multiframe`) generation | `/ent/v2/start-end2video`, `/ent/v2/multiframe`, `/ent/v2/tasks/{id}/creations`, `/ent/v2/credits` | `src/server/video-providers/vidu.ts` |
| **Vercel Blob** | Storage | Images, segments, finals, voice audio, clones, manifests | `@vercel/blob` upload/del | `src/lib/vercel-blob-config.ts`, `src/lib/final-video-storage.ts`, `src/lib/segment-blob-storage.ts` |
| **Stripe** | Payment | Instant Premium checkout (EUR) | Checkout Sessions API | `src/lib/stripe-server.ts`, `src/app/api/instant-premium/checkout/route.ts` |
| **PostgreSQL** | Database | All app data (Prisma) | `DATABASE_URL` | `prisma/schema.prisma` |
| **rembg API** | Image (optional) | Foreground segmentation | `REMBG_API_URL` | `src/server/instant-premium/foreground-segmentation/segment-foreground.ts` |

### Infrastructure (verified references, not SaaS SDKs)

| Provider | Role | Evidence |
|----------|------|----------|
| **Vercel** | Next.js hosting, Blob, env detection | `VERCEL`, `VERCEL_URL` in `src/lib/video-ffmpeg-runtime.ts` |
| **Railway** | Video worker deployment (documented) | `docs/railway-video-worker.md`, `VIDEO_WORKER_BASE_URL` |
| **External merge worker** | FFmpeg merge HTTP service | `EXTERNAL_MERGE_API_URL`, `worker/ffmpeg-merge-worker/` |
| **Local FFmpeg / MediaPipe / ONNX** | Export merge, safe zones, object detection | No per-call cloud cost |

### Auth & payment — verified negatives

| Expected | Status in codebase |
|----------|-------------------|
| Google OAuth | **Not found** |
| Facebook OAuth | **Not found** |
| Neon (named) | **Not found** — generic `DATABASE_URL` only |
| Stripe webhooks | `STRIPE_WEBHOOK_SECRET` in `.env.example`; **no webhook route** in `src/app/api/` |

Auth is **custom session** (`hc_session` cookie): `src/server/auth/session.ts`.

### Planned-only (registry, no API client)

Azure Voice, OpenAI Voice, Suno, Udio, Freesound, Artlist, Kling, Runway — `src/lib/studio-provider-registry.ts`.

---

## Provider Cost Analysis

### Central billing constants (verified)

| Constant | Value | File |
|----------|-------|------|
| Vidu credit USD | **$0.005** / credit | `src/lib/animation-presets.ts` (`CREDIT_USD`), `src/server/provider-usage/credit-cost.ts` |
| OpenAI OCR estimate | **$0.012** / call | `src/server/admin/render-analytics-cost.ts` |
| Internal merge estimate | **$0.001** / job | same |
| Blob storage default | **$0.15** / GB / month | `src/lib/blob-storage-pricing.ts` |
| Infra baseline (analytics) | **$20** / month | `src/server/admin/render-analytics-cost.ts` |
| EUR→USD (margin sim) | **1.08** default | `src/server/provider-cost/margin-simulation.ts` |

### What is actually metered post-render

| Provider action | Metering | Accuracy |
|-----------------|----------|----------|
| **Vidu render** | Balance delta `creditsBefore - creditsAfter` | **Exact** when balance API works; else preset/duration **estimate** |
| **OpenAI OCR** | Flat $0.012 per event | **Estimated** (`isEstimated: true`, reason: no balance endpoint) |
| **Internal merge** | Flat $0.001 | **Estimated** |
| **Language export / text rerender / video export** | Unit cost **$0** in `cost-event-types.ts` | **Not tracked** as provider COGS |
| **ElevenLabs TTS/STT/clone** | Planning formula only | **Not logged** to `ProviderCostEvent` |
| **DALL·E scene images** | Planning €0.04/image | **Not logged** to `ProviderCostEvent` |
| **Studio vision QA** | No cost event | **Not logged** |

**Unknown:** Actual OpenAI $/image for DALL·E-3 1024×1024 — not in codebase.

---

## OpenAI Audit

### Models in use (verified defaults)

| Model | Env override | Endpoint | Feature |
|-------|--------------|----------|---------|
| `dall-e-3` | `STUDIO_SCENE_IMAGE_MODEL` | Images | Studio scene still generation |
| `gpt-4o-mini` | `OPENAI_VISION_MODEL`, `OPENAI_PREFLIGHT_MODEL`, `OPENAI_CHARACTER_IDENTITY_MODEL`, `OPENAI_TRANSLATE_MODEL`, `STUDIO_VISION_MODEL` | Chat | OCR, preflight, Studio QA, character ref analysis, translation |
| (list) | — | `/v1/models` | OCR health check |

**Not found in code:** `gpt-4`, `gpt-3.5`, `o1`, `o3`.

### Per-call inventory

| Feature | Model | Input sizing (code) | Output cap | Cost tracking | Cache |
|---------|-------|---------------------|------------|---------------|-------|
| Scene image gen | dall-e-3 | prompt ≤ 4000 chars; default 1024×1024 | 1 image URL | **None** (planning €0.04) | **No** |
| OCR (OpenAI path) | gpt-4o-mini | image + short system prompt | max_tokens 900/1400 | **$0.012 flat estimate** | Client hash cache + Google preferred |
| Preflight vision | gpt-4o-mini | 1 image | — | **None** | Skipped when OCR blocks exist |
| Studio scene QA | gpt-4o-mini | 1 scene + up to 4 ref images | — | **None** | **No** |
| Character ref analysis | gpt-4o-mini | up to 5 image URLs + JSON schema | — | **None** | **No** |
| Language translation | gpt-4o-mini | `JSON.stringify(strings)` | reads `usage.total_tokens`; heuristic $0.000002/token | **Heuristic only**; not in cost events | **No** |
| Scene text translation | gpt-4o-mini | batched strings | — | **None** | **No** |

### Duplicate / overlap risks (verified)

1. **Google Vision → OpenAI OCR fallback** — only one path per detect call when Google key set (`image-text-detection/index.ts`).
2. **OCR → preflight** — preflight skipped when OCR blocks available (`preflight-vision-from-ocr.ts`).
3. **Scene image + Studio vision QA** — separate calls per regeneration; no dedup.
4. **Character ref analysis** — optional pre-create; independent of scene gen.

### Optimization potential (audit judgment, no implementation)

| Call | Optimize? | Basis |
|------|-----------|-------|
| Studio vision QA on every regen | **Yes** | High cost if enabled broadly; no cost logging |
| Translation batches | **Maybe** | Single call per export; token usage partially read |
| DALL·E scene images | **Yes** | No cache by prompt hash; regen = full price |
| OCR | **Partially optimized** | Client cache + heuristic skip already exist |

---

## ElevenLabs Audit

### Endpoints used (verified)

| Endpoint | Costs credits? | Used for | Frequency driver |
|----------|----------------|----------|----------------|
| `GET /v1/voices` | **No** (metadata) | Account voice list | 1× per catalog cold build; **1h server cache** |
| `GET /v1/shared-voices` | **No** (metadata) | 12k+ marketplace | Paginated; same cache |
| `POST /v1/text-to-speech/{id}` | **Yes** (provider credits) | Storyboard voice, character preview, post-clone preview | Per click / per scene segment |
| `POST /v1/voices/add` | **Yes** (IVC) | Voice clone | Per clone |
| `POST /v1/speech-to-text` | **Yes** | Subtitle transcribe | Per transcribe action |

**Verified:** No ElevenLabs balance delta logging (unlike Vidu).

### Credit estimate in code (planning only)

```ts
estimatedCredits = max(1, ceil(characters / 500))
```

File: `src/lib/elevenlabs-voice.ts` → used in director report + `studio-production-costs.ts` at **€0.02/credit**.

### Caching (verified)

| Asset | Cache | TTL |
|-------|-------|-----|
| Voice catalog metadata | Server module + Next `revalidate: 3600` | 1 hour |
| Client voice library payload | `studio-voice-library-client.ts` | 1 hour; inflight dedupe |
| ElevenLabs `previewUrl` (hosted) | Played directly in UI | N/A |
| TTS preview audio | Uploaded to Vercel Blob | Overwrite on saved character; **new UUID per draft** |

### Per-preview cost (derived, not measured)

- **Catalog URL play:** $0 ElevenLabs API (CDN URL from catalog).
- **TTS preview click:** 1× `text-to-speech` — **Unknown** exact credits without live API metering; planning uses chars/500.
- **Clone flow:** 1× `voices/add` + **mandatory** 2nd TTS for auto-preview (`create-user-voice-clone.ts`).

---

## Vidu Audit

### Modes (verified mapping)

| User concept | Code | API | Jobs per project |
|--------------|------|-----|------------------|
| Transition mode | `instantMode: "transition"` | `POST /ent/v2/start-end2video` | **N−1** (one per segment) |
| Story mode | `instantMode: "story"` | `POST /ent/v2/multiframe` | **1** multiframe job |
| Classic animate | `projectType: "classic"` | Same provider | Preset-driven |

**No separate `img2video` endpoint** in code — image-to-video is via start-end or multiframe.

### Models & resolution (verified env defaults)

- Transition: `viduq3-turbo` / `viduq3-pro` (`VIDU_MODEL`)
- Multiframe: `viduq2-turbo` / `viduq2-pro` (`VIDU_MULTIFRAME_MODEL`)
- Resolution: `360p`–`1080p` (`VIDU_RESOLUTION`)
- Duration: 1–16s transition; 2–7s multiframe clamps

### Credits per render (verified estimates — UI/billing fallback)

| Preset | cr/s | Duration | cr/transition | Max transitions | Max credits/project |
|--------|------|----------|---------------|-----------------|---------------------|
| basic | 8 | 3s | 24 | 2 | **48** |
| standard | 12 | 5s | 60 | 4 | **240** |
| smooth | 8 | 5s | 40 | 4 | **160** |
| pro | 14 | 5s | 70 | 6 | **420** |

**Exact billing:** `ProviderUsageLog` uses Vidu balance delta when available.

### Customer EUR pricing from credits (verified `video-pricing-config.ts`)

**Transition mode:** €0.99 (0–100 cr) → €1.99 (101–200) → €2.99 (201–350) → €3.99 + €0.50/100cr overflow  
**Story mode:** €2.99 (0–300) → €4.99 (301–600) → €6.99 (601–900) → €9.99 + €1.00/200cr overflow  
**Flat:** text rerender €0.49, language export €0.99, full export €0.49

Minimum margin floors: **30%** (most tiers), **25%** (open-ended top tiers).

### Cache / reuse (verified)

- Vidu credit balance: **60s cache** (`vidu-credits.ts`)
- Segment videos: persisted to Blob after generation (`segment-blob-storage.ts`)
- Optional delete transition blobs after final: `ANIMATION_DELETE_TRANSITION_BLOBS_AFTER_FINAL`
- **No** prompt-level cache preventing duplicate Vidu jobs for identical inputs

---

## Storage Audit

### Vercel Blob — what is stored (verified paths)

| Content | Path pattern | Permanent? |
|---------|--------------|------------|
| Wizard working images | `motion/{clientUploadId}/...` | Until manual delete |
| Segment MP4s | `motion/segments/{projectId}/segment-{n}.mp4` | Often kept; optional cleanup |
| Final exports | `motion/final/{projectId}/final*.mp4`, `clean*.mp4` | Versioned; old deleted on rebuild |
| Studio scene images | `studio/{ownerId}/storyboards/{sbId}/scenes/.../main.*` | **Grows with every regen** |
| Voice TTS output | `studio/.../voice/preview-{lang}/...` | Overwrite (saved) or new UUID (draft) |
| Clone samples | `studio/.../voice-samples/...` | Permanent per clone |
| Clone/audio manifests | `manifest.json` blobs | Permanent |

### Retention policies (verified)

- `deleteStudioReferenceBlob` on entity delete
- `scheduleDeleteOldFinalBlob` after rebuild
- Optional transition blob cleanup after final export
- **No TTL/lifecycle rules** in code for scene images or segments

### Cost drivers (derived)

- **Scene image regens** — each adds full image blob + DB row with large JSON reports
- **Segment + final MP4s** — largest byte volume per project
- **Voice preview drafts** — new blob per draft preview (no dedup by voice+text hash)

---

## Database Audit

**Engine:** PostgreSQL via Prisma — **69 `Json` columns** (verified count in `schema.prisma`).

### Top storage growth vectors (verified append patterns)

| Table / model | Why it grows | Large JSON fields |
|---------------|--------------|-------------------|
| `ProviderUsageLog` | 1+ row per Vidu job | metadata |
| `ProviderCostEvent` | Per provider action | metadata |
| `CustomerBillingEvent` | Per billed action | metadataJson |
| `StudioSceneImage` | Every generation/regeneration | `generationSettings`, `consistencyReport`, `visionReport`, `promptPatches`, … |
| `AnimationProject` | Every render attempt | `studioHandoffJson`, `instantSceneTexts`, `languageTextLayersJson`, … |
| `AnimationImage` | Per uploaded frame | `bakedTextBlocksJson`, `posterMotionLayersJson`, … |
| `ProjectRenderVersion` | Full rerender snapshots | 4 snapshot JSON columns |
| `StudioJob` | Async studio operations | `inputJson`, `resultJson` |
| `StudioCharacterVoiceHistory` | Voice change audit | `snapshotJson` |

### Records likely unused after time (audit hypothesis — **not verified** with retention jobs)

- Old `StudioSceneImage` rows for superseded generations (still referenced by history UI — **Unknown** purge policy)
- `ProviderCreditBalanceSnapshot` (max 1/provider/day — bounded)
- Completed `StudioJob` rows — **no archival job found**

### N+1 / over-fetch (verified)

- Motion handoff: **3 storyboard fetches** (`create-motion-handoff-payload.ts`)
- Director apply: **sequential per-scene HTTP** from client
- Studio job runner: **re-fetch scene per analyze step**
- Asset slug collision: up to **50** `findUnique` loops

---

## API Call Audit

### Flow summary (verified call counts)

| Flow | HTTP API | Provider calls | DB pattern | Cache |
|------|----------|----------------|------------|-------|
| **Character/Prop/Location/World create** | 1 POST | 0 (optional OpenAI ref analysis) | 1 write + 0–50 slug reads | None |
| **Storyboard create** | 1 POST | 0 | 1 write | None |
| **Director proposal** | 0 (client heuristic) | 0 | 0 at build | N/A |
| **Director apply** | 1 + N scene APIs | 0 | N writes + asset asserts | None |
| **Prompt generation** | 0 (in-process) | 0 | 0 | N/A |
| **Scene image (single)** | 1 | 1× DALL·E (if OpenAI provider) | 1 image row + blob | None |
| **Bulk scene images** | 1 | **N sequential** DALL·E | N rows | None |
| **Storyboard voice** | 1 POST | **1+ ElevenLabs TTS** | voice upsert | None |
| **Voice preview click** | 1 POST | **1 TTS** + 1 blob | 0–1 read | **No TTS dedup** |
| **Voice clone** | 1 POST | **1 clone + 1 TTS** | manifest + character | Clone manifest cache (server module) |
| **Motion handoff** | 1 GET | 0 | **3× storyboard reads** | None |
| **Motion render start** | 1 POST | **N× Vidu** (transitions) | project update | Session guard vs duplicate start |
| **Language export** | 1 POST | 0–1 translation; worker FFmpeg | export row | Worker RUNNING guard |
| **Voice marketplace load** | 2 GET (summary + full) | 0–2 ElevenLabs (if cache cold) | 0 | **1h server + client cache** |

---

## Voice Marketplace Audit

### Load pattern (verified, post `25ebbba` debounce fix)

1. `GET /api/studio/voice-library?summary=1` — personas/stats/filters; **empty voices[]**
2. Background `GET /api/studio/voice-library` — full ~12k voices
3. `GET /api/studio/user-voice-library` — user clones (separate)

**Server cache:** 1 hour — second request does **not** re-hit ElevenLabs when warm.

**Client:** `summaryInflight` / `fullInflight` dedupe; 1h session cache.

### Preview behavior (verified)

| Action | ElevenLabs cost | Cached? |
|--------|-----------------|---------|
| Play catalog `previewUrl` | **No API call** | URL from catalog |
| Persona/marketplace TTS preview button | **1× TTS per click** | Blob upload; **no server dedup** |
| Storyboard full narration | **1+ TTS** | Stored per language asset |

### Debounced search (verified `25ebbba`)

- Input immediate; filtering after **400ms** — reduces client CPU, **not** provider calls.

### Per-user marketplace cost (derived scenarios)

**Unknown** without production analytics. Planning-only:

- Catalog load: **≤2 ElevenLabs metadata fetches/hour/user** (often 0 after cache)
- Explorer clicking 10 TTS previews × ~200 chars ≈ 10 TTS calls — **not metered in app**

---

## Credit Economics

**Note:** "Credits gebruiker" for Studio features is often **EUR list price** or **internal planning credits** — not a unified wallet in code for all features.

| Feature | Provider | Werkelijke providerkosten (code basis) | User price (code) | Brutomarge (derived) | Nettomarge |
|---------|----------|----------------------------------------|-------------------|----------------------|------------|
| **Motion (standard, ~240 cr)** | Vidu | **~$1.20** (240 × $0.005) | **€1.99–€2.99** tier | **~45–60%** at €2.99 @ 1.08 FX | **Unknown** (infra, blob, support) |
| **Motion (pro, ~420 cr)** | Vidu | **~$2.10** | **€3.99+** overflow tier | **~50%+** at base tier | Unknown |
| **Scene image (DALL·E)** | OpenAI | **Not logged** | N/A (Studio) | N/A | Planning **€0.04** COGS est. |
| **Voice clone** | ElevenLabs | **Not logged** | N/A | N/A | 2 API calls (clone + preview) |
| **Voice preview (TTS)** | ElevenLabs | **Not logged** | N/A | N/A | Per click |
| **Language export** | OpenAI? + FFmpeg | Translation heuristic; merge **$0** in events | **€0.99** flat | **Unknown** | High if translation skipped |
| **Text rerender** | FFmpeg/worker | **$0** in events | **€0.49** | **Unknown** | Likely high |
| **OCR (Instant)** | Google/OpenAI | **$0.012** est. if OpenAI | Included in video price | Small | Client cache helps |
| **Storyboard/Director** | — | **$0** | **$0** | N/A | Heuristic only |

**Gap:** ElevenLabs + DALL·E + Studio vision are **material COGS** but **absent from `ProviderCostEvent`** — margin dashboards understate true cost.

---

## Subscription Economics

### Roles in code (verified — no tier named "hobby")

| Role | Videos/day | Videos/month | Credits/month cap | Presets |
|------|------------|--------------|-------------------|---------|
| **user** (≈ hobby) | 5 | 30 | 3,000 | basic, standard only |
| **power** | 20 | 150 | 20,000 | all four |
| **admin** | 999,999 | 999,999 | 999,999 | all + advanced controls |

Source: `src/server/animations/usage-limits.ts`, `src/server/auth/permissions.ts`.

### Scenario analysis (derived from verified caps + standard preset 240 cr/video)

| Persona | Requested | Code limit | Max videos @ 240 cr | Vidu COGS @ max | Notes |
|---------|-----------|------------|---------------------|-----------------|-------|
| Hobby | 5/mo | 30/mo OK | 5 × $1.20 = **$6** | Within caps | Likely profitable per video |
| Hobby | 5/mo | — | — | + Studio images/voice **untracked** | True COGS higher |
| Average | 30/mo | 30/mo OK | **12 videos** by 3,000 cr cap | 12 × $1.20 = **$14.40** | **Credit cap binds before video cap** |
| Power user | 200/mo | **150/mo max** | 150 × $1.20 = **$180** | 20,000 cr ≈ 83 videos | 200/mo **not allowed** without role change |

**Unknown:** Per-user Studio image gen volume, voice preview abuse, storage GB/month — not aggregated in code for subscription modeling.

**Infrastructure:** Analytics assumes **$20/mo baseline** — **Unknown** actual Vercel/Railway bill at scale.

---

## Provider Terms Audit

**Source:** Public terms URLs fetched 2026-06-06. **Not legal advice.** Confirm with counsel for production compliance.

### OpenAI

- API/SaaS use generally permitted under [OpenAI Services Agreement](https://openai.com/policies/services-agreement) for paid API accounts.
- **Risk:** Output usage, data retention, and prohibited use policies apply to white-label voice/marketplace UX.
- **Unknown in repo:** Whether account tier matches commercial resale of generated content to end users.

### ElevenLabs

- [Terms of Use](https://elevenlabs.io/terms-of-use): Paid plans allow commercial use; free tier **non-commercial only**.
- [OEM Terms](https://elevenlabs.io/oem-terms): **Free/Starter/Creator/Pro UI tiers prohibited** from "Making Available" Services/Bundled Service to end users — **Business/OEM path required** for embedded marketplace in SaaS.
- API terms: **Resale/redistribution of API access prohibited** unless Authorized Reseller.
- **Risk for Motion Studio:** Embedding 12k voice marketplace + per-user TTS previews may require **OEM/enterprise agreement** and co-branding ("powered by ElevenLabs").

### Vidu

- [API Terms](https://platform.vidu.com/docs/terms-of-use): Commercial use **not restricted**; **selling Vidu technology** without consent prohibited.
- Output export restrictions for sanctioned regions/entities.
- **Risk:** Plan tier (Free vs Pro) affects commercial license per Vidu FAQ — **Unknown** which plan the production API key uses.

### Stripe

- Standard Stripe Services Agreement applies to checkout flow.
- **Verified gap:** No webhook handler — fulfillment via success redirect (`/complete`).

### Google Cloud Vision

- Google Cloud ToS + Vision API pricing; OCR sends user image URLs/content.

---

## Performance vs Cost

| Feature | Kwaliteitsimpact | Kostenimpact | Gebruik | Oordeel |
|---------|------------------|--------------|---------|---------|
| Vidu motion render | **Critical** | **High** | High | **Behouden** — core product |
| DALL·E scene stills | **Critical** | **Medium–High** | Per scene/regen | **Behouden** — add cost logging first |
| ElevenLabs TTS preview | **High** | **Medium** (unmetered) | High in marketplace | **Behouden** — add dedup/cache |
| ElevenLabs catalog metadata | Medium | **Low** after 1h cache | Once/session | **Geoptimaliseerd** (progressive load) |
| Voice marketplace search | Low (UX) | **Low** (client CPU) | High | **Geoptimaliseerd** (debounce `25ebbba`) |
| Studio vision QA | Medium | **Medium** (unlogged OpenAI) | Per regen | **Optimaliseren** — gate behind user action |
| OpenAI OCR | Medium | Low–medium | Instant Premium | **Behouden** — cache exists |
| Google Vision OCR | Same | Per Google pricing | Preferred path | **Behouden** |
| Director proposal (heuristic) | Medium | **$0** | High | **Behouden** |
| Motion handoff triple DB fetch | Low | **DB cost** | Per import | **Optimaliseren** |
| Language export translation | Medium | Low per call | Occasional | **Behouden** |
| FFmpeg merge (worker) | High | **~$0** logged | Per export | **Behouden** |
| Blob segment retention | Low | **Storage** | All projects | **Optimaliseren** — lifecycle policy |

---

## Cost Leaks

Top 20 by estimated impact (audit ranking; **$ = order-of-magnitude from code constants**)

| # | Leak | Oorzaak | Impact | Fix difficulty | Expected saving |
|---|------|---------|--------|----------------|-----------------|
| 1 | **ElevenLabs TTS not metered** | No `ProviderCostEvent`; unlimited preview clicks | **High** | Medium | Visibility + dedup |
| 2 | **DALL·E scene regens** | No prompt cache; each regen = full image call | **High** | Medium | Hash cache / reuse |
| 3 | **Voice preview no dedup** | Same voice+text → new TTS every click | **High** | Low | Server-side preview cache |
| 4 | **Clone auto-preview** | Always 2nd TTS after `voices/add` | Medium | Low | Optional skip |
| 5 | **Studio vision QA** | OpenAI multi-image calls; no cost events | Medium | Medium | Opt-in QA |
| 6 | **Bulk scene images sequential** | N provider calls in loop | Medium | High | Parallelism w/ cap |
| 7 | **Motion handoff 3× DB fetch** | Redundant storyboard loads | Low–medium | Low | Single joined query |
| 8 | **Director apply N+1 HTTP** | Client sequential scene APIs | Low (latency) | Medium | Batch endpoint |
| 9 | **Studio job scene re-fetch** | N+1 per analyze step | Low–medium | Low | Pass scene row |
| 10 | **Draft voice preview blobs** | New UUID every draft preview | Medium (storage) | Low | Content-hash path |
| 11 | **Scene image JSON bloat** | Full reports on every row | Medium (DB) | Medium | Prune old reports |
| 12 | **Segment blobs retained** | No default cleanup | Medium (storage) | Low | Enforce cleanup flag |
| 13 | **Translation cost not in events** | `translationCostEstimate` unused | Low | Low | Wire to analytics |
| 14 | **OpenAI OCR estimate only** | Flat $0.012 may drift | Low | Low | Token-based estimate |
| 15 | **Credit cap vs video cap mismatch** | Users hit 3000 cr before 30 videos | Product | N/A | Pricing/limits alignment |
| 16 | **Full catalog to every client** | ~12k voices JSON over wire | Medium (bandwidth) | High | Server-side filter API |
| 17 | **Slug collision loops** | Up to 50 DB reads | Low | Low | Random suffix |
| 18 | **Language export worker duplicate** | Guard exists — low leak | Low | — | Already guarded |
| 19 | **Vidu balance cache 60s** | Stale estimate edge cases | Low | — | Acceptable |
| 20 | **Infra $20/mo assumption** | May understate at scale | **Unknown** | — | Real billing export |

---

## Quality Wins

Top improvements where quality ↑ and cost ↔ or ↓ (audit recommendations only)

| # | Win | Quality | Cost effect |
|---|-----|---------|-------------|
| 1 | Cache TTS previews by `(voiceId, textHash, lang)` | Same UX, faster replay | **↓ ElevenLabs** |
| 2 | Prompt-hash cache for scene images | Consistent regen | **↓ OpenAI** |
| 3 | Log DALL·E + ElevenLabs to `ProviderCostEvent` | Better economics visibility | Neutral |
| 4 | Progressive voice catalog (server filter) | Faster marketplace | **↓ bandwidth** |
| 5 | Single handoff DB query | Faster import | **↓ DB** |
| 6 | Batch director scene apply API | Faster story setup | **↓ HTTP overhead** |
| 7 | Gate Studio vision QA behind explicit user action | Focused QA | **↓ OpenAI** |
| 8 | Reuse OCR blocks for preflight (already partial) | Consistent risk scoring | **↓ OpenAI** |
| 9 | Enforce transition blob cleanup default-on | No quality loss post-final | **↓ storage** |
| 10 | Identity-aware motion instructions (Phase B) | Better video w/o extra Vidu calls | Neutral |
| 11 | Debounced marketplace search (`25ebbba`) | Smoother UX | **↓ client CPU** |
| 12 | Summary-first voice load | Personas usable immediately | **↓ ElevenLabs cold calls** |
| 13 | Vidu exact balance delta (already implemented) | Accurate billing | Neutral |
| 14 | Google Vision preferred for OCR | Often better OCR | Cost ↔ (provider dependent) |
| 15 | Heuristic director (no LLM) | Fast proposals | **$0** quality adequate for v1 |
| 16 | Motion instruction priority packing (Phase B) | Better output same 520 chars | Neutral |
| 17 | Canonical ref priority in prompts | Better consistency | Neutral |
| 18 | Prune stale `StudioSceneImage` versions | Cleaner history UI | **↓ DB** |
| 19 | Per-role preset gating | Prevents pro cost on user tier | **↓ Vidu exposure** |
| 20 | OEM review with ElevenLabs | Legal safety for marketplace | Risk ↓ |

---

## Immediate Wins

1. **TTS preview dedup/cache** — highest unmetered leak, low effort  
2. **Log OpenAI image + ElevenLabs TTS costs** — no UX change, enables real margin  
3. **Motion handoff single fetch** — verified redundant queries  
4. **Optional skip clone auto-preview** — saves 1 TTS per clone  
5. **Default-on transition blob cleanup** — env already exists  

## Medium-Term Wins

1. Scene image prompt-hash cache  
2. Studio vision QA gating + cost events  
3. Batch scene apply / director API  
4. Server-side voice marketplace filtering (avoid 12k client payload)  
5. ElevenLabs OEM/commercial compliance review  

## Long-Term Wins

1. Unified COGS dashboard (all providers in `ProviderCostEvent`)  
2. Blob lifecycle / retention automation  
3. DB archival for `StudioSceneImage` + `ProviderUsageLog`  
4. Subscription tier redesign aligned to credit economics  
5. Stripe webhook fulfillment hardening  

---

## Executive Summary

### Wat kost Motion Studio werkelijk?

**Verified core COGS driver:** **Vidu credits at $0.005/credit**, measured by balance delta when logging works. A typical **standard** project (~240 credits) ≈ **$1.20** provider cost before ElevenLabs, DALL·E, storage, and infra.

**Under-reported in analytics:** ElevenLabs TTS/clone, DALL·E scene images, Studio vision QA, and most FFmpeg/export work (logged as $0).

### Welke feature is het duurst?

**Vidu motion render** (by dollar volume). Within Studio adjacency: **scene image generation (DALL·E)** and **ElevenLabs TTS** are material but **not fully tracked**.

### Welke feature levert de meeste waarde?

**Vidu motion output** (core product) + **scene stills** (conditioning quality) + **voice preview/selection** (creator confidence). **Director heuristic** delivers planning value at **$0** provider cost.

### Welke provider is het grootste risico?

**ElevenLabs** — OEM/commercial terms for embedded marketplace + API resale restrictions (**terms audit**). Technical risk is secondary to **contract compliance**.

### Welke provider is het duurst?

**Vidu** at scale (per rendered video). **OpenAI** second when scene regens + vision QA are heavy.

### Welke optimalisatie levert de meeste winst?

1. **TTS preview caching/dedup** (unmetered ElevenLabs)  
2. **Provider cost logging for OpenAI images + ElevenLabs** (enables real pricing)  
3. **Scene image prompt reuse** (DALL·E)  

### Welke optimalisatie moet direct worden uitgevoerd?

**Audit-only sprint — no implementation in this report.** If prioritized: **TTS preview cache** + **cost event wiring** + **handoff DB dedup** — all verified leaks, minimal product risk.

### Welke onderdelen moeten absoluut NIET opnieuw gebouwd worden?

- Vidu provider integration (`src/server/video-providers/vidu.ts`)  
- ElevenLabs voice library + progressive client load  
- Credit-tier EUR pricing engine (`video-pricing-config.ts`, `video-pricing.ts`)  
- Provider usage logging for Vidu balance delta  
- Custom auth session system  
- FFmpeg worker / external merge pipeline  
- Voice marketplace faceted filter architecture (extend, don't replace)  
- Studio prompt builder (in-process, no LLM)  
- Director heuristic proposal builder  

---

## What Should NOT Be Rebuilt

| System | Reason |
|--------|--------|
| Vidu animation job orchestration | Balance-delta metering works |
| EUR credit-tier pricing V1 | Centralized, margin floors defined |
| Progressive voice library load | Recently optimized; 1h cache |
| Debounced marketplace search | Shipped `25ebbba` |
| OpenAI request gate + OCR client cache | Rate-limit + dedup exist |
| Motion handoff payload builder | Rich runtime package; optimize queries only |
| Identity consumption layers (Phase A/B) | Quality without extra provider calls |
| Provider registry (planned vs live) | Correct separation |

---

## Validation

- **No code modified** for this audit  
- **No fixes implemented**  
- **No pricing changed**  
- Facts tied to codebase @ `25ebbba` and cited files  
- Provider terms from public documentation URLs (legal review still required)  
- Gaps explicitly marked **Unknown** where code does not instrument cost or usage  

---

*End of audit.*
