# PX.4A — Free Photo Video Creator (read-only audit)

**Phase:** PX.4A — Free photo-to-video composer (not generative AI)  
**Date:** 2026-08-17  
**Mode:** Audit first. **No implementation until architecture is approved.**  
**Do not start PX.5.** Do not mutate live listings. Do not put paid AI on the free critical path.

**Preserved law:** PX.1–PX.4 remain complete. PX.3 remains ONE STUDIO → ONE FRONT DOOR → INTENT FIRST (`Wat wil je maken?`). PX.4 listing context stays the source of truth for owned-item entry.

**Repos proven:** Studio `homecheff-motion` · HomeCheff `homecheff-app` (`/Users/sergioarrias/Homecheff-app git`)

---

## Verdict (V)

**CONDITIONAL GO.**

The product is viable as a **browser-local composer** with a **client-side final encode**, reusing patterns that already exist — not Instant, not Motion, not server ffmpeg, not ElevenLabs.

Ship **only after** the architecture below is approved. Do not treat existing “slideshow / photo story / Instant transition” as the free engine: those paths are **credit-consuming generative or server-ffmpeg**.

| Gate | Status |
|------|--------|
| Client preview (canvas Ken Burns + transitions + text + watermark) | GO |
| Client export as primary path | GO, with Safari/MP4 certification in PX.4A.5 |
| Free licensed music library | **NO-GO until licenses are proven** — ship Geen muziek + Eigen muziek first |
| Instant / Vidu / photo-movie / ElevenLabs on free path | **NO-GO** |
| Server ffmpeg as default free encode | **NO-GO** (Vercel app cannot spawn ffmpeg; worker has recurring cost) |
| Anonymous server storage / render | **NO-GO** |
| Live listing auto-attach (PX.5) | **NO-GO** |
| Item-creation wizard attach after authenticated export | GO (narrow, same unpublished form) |
| New Prisma `PHOTO_VIDEO` type | **NO-GO unless reuse fails** — prefer local draft → existing project after auth |

---

## A. Existing composer technology

| Surface | What it is | Reuse for PX.4A free path? |
|---------|------------|----------------------------|
| Instant Premium `instantMode: "transition"` | Provider-billed interpolation between images (Vidu). Credits + € quote (`transition_mode` €0.99 at 0–100 credits). | **No.** Generative, paid. |
| `studio-photo-movie-plan.ts` | Slideshow/photo_story planner: 12 credits/scene, 30–600s targets, ffmpeg merge if >6 scenes. | **No.** Paid Motion plan. Duration also exceeds HomeCheff 30s. |
| Publish `createSlideshowProject` / `createPhotoStoryProject` | Timeline **data model**: slides with `startTime`/`endTime`, `renderMode: slideshow \| ken_burns`. | **Data shape only.** Do not call the publish ffmpeg renderer for free export. |
| `publish-story-render.ts` | Server Ken Burns via ffmpeg `zoompan` at 1080×1920 / 30fps, then concat. Requires host ffmpeg. | **Not for free default.** Vercel `shouldRunFfmpegLocally()` is **false**. Merge lives in `worker/ffmpeg-merge-worker`. |
| HomeCheff `compressVideo()` | Canvas + `HTMLVideoElement.captureStream` + **MediaRecorder**. Client-side. | **Encode pattern to reuse** (composition must be new: stills, not recompressing an existing video). |
| Instant wizard IndexedDB | `hc-instant-wizard-blobs` + memory fallback for Safari private mode. | **Persistence pattern to copy**, separate DB name. Do not mix Instant drafts. |
| PX.4 `StudioSourceContext` | Verified listing title, description, media URLs (cap 8), seller display name, return target. | **Yes.** Prefill listing photos + optional title. Extra video-only photos stay local. |
| Editor canvas | Image editor, not a video compositor. | No as the video engine. |

**Conclusion:** There is **no** existing free, local, multi-photo video compositor. There is a Ken Burns **ffmpeg** renderer (paid/infra) and a HomeCheff **MediaRecorder** compressor. PX.4A should build a **small dedicated client compositor**, not a new Studio product silo and not a fork of Instant.

---

## B. Existing transition technology

| Kind | Location | Free-safe? |
|------|----------|------------|
| Instant transition seconds 3 / 5 / 8 | Instant mode panel; billed as `transition_mode` | **No** — AI interpolation |
| Publish slideshow concat | ffmpeg concat of Ken Burns segments — **cuts**, no overlap crossfade | Infra cost; not client preview |
| Story overlay `transitionDurationSeconds` | Instant scene text drafts | Timing metadata only |

**PX.4A must implement local canvas transitions.** Curated user outcomes (not 40 names):

| User choice | Internal mapping (proposed) |
|-------------|-----------------------------|
| Automatisch | Mix: mild zoom + short crossfade |
| Vloeiend | Crossfade ~0.4s |
| Rustig | Longer crossfade ~0.5s + slower Ken Burns |
| Energiek | Short cut or 0.2s wipe + stronger zoom |

Advanced per-clip transition editing stays in Studio’s advanced editor (out of free critical path).

---

## C. Existing audio technology

| Capability | Status | Free path |
|------------|--------|-----------|
| User music **upload** to Studio library | LIVE, Blob, after auth | Own music: **local File first**; upload only after account |
| ElevenLabs generate-music | LIVE, **credits** | **Forbidden** on free path |
| `STUDIO_AUDIO_ASSET_LIBRARY` music_* rows | Planning catalog, `licenseType: "system"`, **no audio files**, no redistribution proof | **Cannot ship as “gratis muziek”** |
| Provider ids `epidemic` / `freesound` / `licensed_library` | Registry / assignment types | **Not a licensed downloadable library** |
| Publish audio mux | Server ffmpeg | Not anonymous; not default free encode |
| Voice clone MediaRecorder `audio/webm` | LIVE | Unrelated |

**Music architecture for v1:** Geen muziek + Eigen muziek only. Free library is a later gated subphase after legal proof.

---

## D. Existing waveform technology

**No** production waveform / draggable audio-window component exists.

Studio has playback cards (`studio-audio-preview-player`, music preview), not a trim window.

**PX.4A.2** should add a small client waveform (or simple amplitude timeline) via `decodeAudioData` + canvas peaks. Cheap, local, lazy-loaded. Do not copy a branded CapCut/TikTok layout.

---

## E. Existing preview technology

| Surface | Preview model |
|---------|----------------|
| Instant wizard | Image slots + OCR + story text; **not** a real-time slideshow player of stills with Ken Burns |
| Motion / Instant render | Provider video URL after paid job |
| Publish | After ffmpeg export |
| HomeCheff VideoUploader | Plays uploaded file |

**PX.4A preview must be a canvas (or CSS) compositor driven by `requestAnimationFrame`:** reorder / text / music window changes must **not** re-encode. Watermark visible in preview (honest output).

---

## F. Existing export technology

| Path | Where | Cost | Notes |
|------|-------|------|--------|
| Instant / Motion export | Provider + optional worker ffmpeg overlay | Credits + compute | Out of free path |
| Publish story/slideshow export | `exportPublishProjectVideo` → `renderPublishStoryBaseVideo` (ffmpeg) | Worker/host compute | Fails on Vercel app host (“ffmpeg unavailable”) |
| HomeCheff `compressVideo` | Browser MediaRecorder, target 1920×1080, 2.5 Mbps, H.264, ~10 MB | User CPU | If `video/mp4` unsupported, **keeps original file** — that fallback is useless for PX.4A because we **create** the file |
| Studio MediaRecorder | Voice clone only | — | Codec negotiation not built for photo video |

**No ffmpeg.wasm / `@ffmpeg/ffmpeg` / WebCodecs `VideoEncoder` in the Studio app today.**

---

## G. Existing render infrastructure

- Vercel serverless: **no** ffmpeg-static in the Next app (`no-ffmpeg-static-in-app` test).
- Language/export and Instant overlays: **video worker** (`VIDEO_WORKER_BASE_URL`).
- Recurring cost if used for every free export: worker CPU + temp disk + Blob.

**Do not make the worker the happy path for a “free” product.** Reserve it as an **authenticated last-resort fallback** only if browser encode is proven unusable on a class of devices, with economics documented in PX.4A.5.

---

## H. Current render cost model (free vs credit)

Credits today correlate with **provider / billed actions**, not with “using Studio”:

| Action | Credits / money |
|--------|-----------------|
| Instant transition / story render | Credits; `transition_mode` quoted from credit use |
| Photo-movie plan | `sceneCount * 12 + 5` credits |
| ElevenLabs music / SFX / TTS | Credit actions |
| Audio library upload | Free (storage) |
| Opening Home / chooser | Free |
| ffmpeg worker | Infra, often bundled into paid export |

**Canonical PX.4A contract**

**FREE class (no credits):** photos, order, crop/fit, local Ken Burns, local transitions, simple text, no/own music, music segment, preview, watermarked export, wizard attach of that file.

**CREDIT class (later, optional, labeled before confirm):** Vidu/Instant motion, generative image/video/scene, ElevenLabs, premium AI edit, paid provider ops.

Do **not** charge credits because the user used Studio or exported a local slideshow.

---

## I. HomeCheff video contract (proven)

Do not assume — these are production constants.

| Rule | Proven value | Where |
|------|----------------|-------|
| Max duration | **30 seconds** | `lib/videoUtils.ts` `MAX_VIDEO_DURATION = 30`; all listing forms pass `maxDuration={30}` |
| Max file size | **50 MB** | `MAX_VIDEO_SIZE`; `/api/upload` and chunked video init |
| Client compress target | 1920×1080, 2.5 Mbps, H.264, ~10 MB after compress | `COMPRESSION_SETTINGS` |
| Videos per listing | **Exactly one** | `ProductVideo.productId @unique` |
| Duration on server | **Not re-validated** on upload (“cannot easily check duration server-side”). Duration block is **client** (`validateVideoFile` fails only when message contains “te lang”) | Gap: honor 30s in the composer so we never emit a file the uploader will reject |
| General accepted types | MP4, WebM, MOV, AVI, 3GP, MKV, M4V, … | `validateVideo` |
| **Listing/dish uploader** | **`uploadContext="dish"` → MP4 / MOV / M4V only** (Safari/iOS playback parity) | `VideoUploader.tsx` `DISH_ALLOWED_*`; used by `MarketplaceOfferForm` and Compact Chef/Garden/Designer |
| Resolution / aspect | **No hard listing aspect.** Player is generic. Marketplace tiles use 4:5 / 1:1 / 4:3 for photos, not a video ratio lock | Prefer 9:16 for promo; offer 1:1 and 16:9 |
| Upload | Chunked to Vercel Blob (2 MB chunks; bypass 4.5 MB serverless body) | `/api/upload/video-chunked/*` |
| Auth | Listing create/update is already authenticated seller | Item wizard is not anonymous |

**HARD OUTPUT for HomeCheff attach:** duration ≤ 30s, size ≤ 50 MB, **container MP4 (H.264)** for dish/listing forms. WebM may work on `uploadContext="general"` but **will be rejected** on the actual item forms.

Studio-only download may keep WebM if MP4 encode fails, with honest copy — but **wizard attach must be MP4**.

---

## Photo count and timing (authoritative calculator)

**Do not** use `n × 2s + sum(transition durations)` if transitions overlap.

Proposed single function:

```
total = n * hold + endCard - (n - 1) * overlap
constraint: 2 ≤ n ≤ nMax(hold, overlap, endCard)
total ≤ 30
```

| Pace | Hold | Typical overlap |
|------|------|-----------------|
| Kort | 1.5s | 0.30s |
| Normaal (default) | 2.0s | 0.40s |
| Rustig | 2.5s | 0.50s |

Worked examples (no end card):

| n | Normaal | Rustig |
|---|---------|--------|
| 2 | 3.6s | 4.5s |
| 5 | 8.4s | 10.5s |
| 12 | 19.6s | 24.5s |
| 13 Rustig | — | 26.5s |
| 15 Rustig | — | 30.5s **illegal** |

**Product cap:** **min 2, max 12 photos** (short promo; listing wizard only has 5 listing photos). Adding a photo is disabled when the calculator would exceed 30s (e.g. Rustig + end card). UI shows **remaining seconds**.

PX.4 listing import cap is **8** HTTPS images; user may add **video-only** photos up to 12 total without mutating listing images.

---

## J. Browser support matrix

| Capability | Chrome desktop | Safari desktop | Chrome Android | Safari iOS |
|------------|----------------|----------------|----------------|------------|
| Canvas + rAF preview | Strong | Strong | Strong | Strong |
| Web Audio mix + decodeAudioData | Strong | Strong | Strong | Strong |
| IndexedDB blob draft | Strong | Strong; **private mode often fails** (Instant already has memory fallback) | Strong | Same private-mode risk |
| `MediaRecorder` | Strong; WebM default; MP4 **variable** | Often `video/mp4` | Strong WebM | iOS 14.3+ MediaRecorder; typically mp4 |
| `canvas.captureStream` | Strong | Historically weaker; must certify | Strong | Must certify; UI must not freeze |
| WebCodecs `VideoEncoder` | Strong | Partial (newer Safari) | Strong | Mixed |
| ffmpeg on device | N/A | N/A | N/A | N/A |

**Tradeoff (proven enough to choose, must certify in PX.4A.5):**

- **Preview:** client-only. No debate.
- **Export:** prefer **MediaRecorder from the same canvas + mixed audio**, codec negotiation **mp4 then webm**.
- HomeCheff attach **requires MP4**. If the browser only emits WebM: **do not silently fail**. Options in order of cost: (1) retry mp4 MIME; (2) lazy WebCodecs + mp4 muxer (no server $); (3) lazy ffmpeg.wasm transcode (large download, $0 compute); (4) authenticated worker transcode (real $ — last resort); (5) “Open op desktop” with honest copy.

HomeCheff’s own compressor **already documents** “if MP4 unsupported, keep original” — that is **not** acceptable for a synthesised slideshow. PX.4A needs an explicit Safari/iOS encode path.

---

## Cost matrix

| Function | Runs where | External $ | Compute $ | Storage $ | Bandwidth $ | Can run client-side? | Recommendation |
|----------|------------|------------|-----------|-----------|-------------|----------------------|----------------|
| 1. Image select / listing HTTPS prefetch | Browser (listing URLs already stored) | No | No | No (anon) | Listing images if drawn from Blob CDN | Yes | Client. Extra video-only files stay File/ObjectURL until auth |
| 2. Image transform / Ken Burns | Browser canvas | No | User GPU/CPU | No | No | Yes | Client |
| 3. Preview | Browser rAF | No | User | No | No | Yes | Client. Never server render |
| 4. Transitions | Browser | No | User | No | No | Yes | Client. Not Instant |
| 5. Audio decode / mix / segment | Browser Web Audio | No | User | No until auth upload | No | Yes | Client. No ElevenLabs |
| 6. Text + watermark | Canvas draw | No | User | Brand PNG already on Studio CDN | Tiny (logo asset) | Yes | Client. Real `/homecheff-globe-man.png` |
| 7. Final encode | Browser MediaRecorder / WebCodecs | No | User | No | No | **Usually yes** | Client primary |
| 8. Export download | Browser | No | No | No | No | Yes | Free file to disk after auth gate |
| 9. Studio project persist | Vercel Blob + DB after auth | Blob $ | Tiny | Yes | Yes | After login | Authenticated only |
| 10. HomeCheff attach | Existing chunked upload | Blob $ (already the listing video path) | Upload fn | Yes (one ProductVideo) | Yes | Upload after wizard compose | Wizard A only; not live listing |
| Anonymous Blob upload | Server | **Yes — abuse** | Yes | Yes | Yes | Avoid | **Forbidden** |
| Worker ffmpeg fallback | Worker | Host $ | **Yes per export** | Temp | Yes | No | Last resort, authenticated, documented |
| Instant / Vidu / music gen | Provider | **Yes** | Yes | Yes | Yes | No | Credits later; never free path |

**Economics of calling it “free”:** marginal platform cost of the happy path is **≈ 0** until authenticated Blob (same as any listing video or Studio save). That storage is already accepted for HomeCheff videos. Do not add a second render bill.

---

## K. Proposed free architecture

```
Photos (File | listing HTTPS)
  → local composition document (order, include flags, ratio, pace, style, text, music)
  → canvas compositor (preview, watermark on)
  → [account gate if anonymous]
  → MediaRecorder / WebCodecs encode ≤ 30s, ≤ 50MB, prefer H.264 MP4
  → Studio save (Projecten) and/or wizard setVideo(...)
```

**Not used on free path:** Instant, Motion start, photo-movie plan, publish ffmpeg, ElevenLabs, Director.

**Lazy load:** compositor + encoder + waveform. Do not load Director / Instant / ffmpeg.wasm on Studio Home. Protect SP.2D Home p50 ~340 ms and editor p50 ~833 ms.

**Aspect:** 9:16 default for HomeCheff item + Studio mobile; 1:1 and 16:9 as simple chips. No pixel fields in normal mode. Output height cap 1080 (720 on weak devices).

**Output quality (target, certify later):** 720p or 1080p, 30 fps, H.264 + AAC (or browser-equivalent), bitrate on the order of HomeCheff’s 2.5 Mbps so 30s stays ≪ 50 MB. Good enough for listing + Reels; not 4K.

---

## L. Anonymous architecture

Studio `/` is public (`isPublicStudioSurface` is only `/` and `/pricing` today).

**Required:** a public route e.g. `/studio/photo-video` added to `isPublicStudioSurface` so silent SSO `login_required` does not bounce visitors to `/login`.

Allowed before account (all **local**):

- add/reorder photos, ratio, style, text, no music, own music File, segment window, lightweight preview

Forbidden before account:

- Blob upload, worker render, Instant, generation APIs, listing mutation

Local constraints (sane, not hostile): max 12 photos, per-image size aligned with Studio working image budget (~4 MB working), audio e.g. ≤ 20 MB / reasonable duration, composition ≤ 30s.

---

## M. Signup preservation architecture

SSO **navigates** (silent SSO / IdP). In-memory `File` objects die. **IndexedDB on `studio.homecheff.eu` survives same-origin return.** Instant already proved this pattern + memory fallback.

**Plan:**

1. Composition JSON in localStorage (no binary).
2. Photo + audio blobs in a **new** IndexedDB (`hc-px4a-draft-blobs`), not Instant’s DB.
3. Same-tab / same-origin auth return restores draft.
4. Honest copy if private mode cannot persist: work can be lost without an account.
5. **Do not** upload anonymous files to Blob “just to survive signup.”
6. After session: optional upload → existing Studio project; appear under **Projecten** (PX.3 “Bewerken” language). No “slideshow product” silo.

Account gate **after meaningful preview, before durable save / full-quality export:**

> Je video staat klaar om af te maken. Maak gratis een account om je project te bewaren, je video te exporteren en later verder te gaan. Zonder account kan dit lokale werk verloren gaan.

No fake urgency.

---

## N. Music architecture

**v1 ship:** A Geen muziek · C Eigen muziek. User-rights copy required. No AI processing. Segment window length **equals current video duration**; drag over the track; clamp to track end; live start time; preview from start; touch-first.

**Track shorter than video (chosen rule):** play once, then **silence**. Do **not** silently loop. Copy: the track is shorter than the video; after that it is quiet. Least surprising; avoids looping copyrighted uploads.

**Loop:** only if a later UX explicitly offers “Herhaal nummer” with visible state.

**Gratis library:** **blocked** until each track has proven: commercial use, embedding in user-exported videos, attribution, geo/platform limits. Epidemic/Freesound/system catalog ids are **not** proof. ElevenLabs music is **paid**.

Music is **muxed into the exported file**, not redistributed as a separate downloadable track.

---

## O. Watermark architecture

- Asset: **`/homecheff-globe-man.png`** (`HOMECHEFF_BRAND_ICON_SOURCE`). Do not reconstruct a fake logo.
- Small, bottom-right (or design-system safe corner), safe-area aware, all of 9:16 / 1:1 / 16:9.
- Subtle scrim/outline for contrast on light and dark media.
- Preview **and** export. Branding, not punishment.
- **Do not** implement paid watermark removal in PX.4A.
- Future entitlement may be documented only.

Existing i18n `brand.studio.watermark` (“Gemaakt met HomeCheff Studio”) is text, not the mark. Prefer the globe mark; optional tiny wordmark if contrast needs it.

---

## P. HomeCheff item-wizard integration point

**Default `/sell/new` skips `wizard-photo`.** `sellsNewSkipWizard()` returns true for the V3 marketplace flow. The live media UI is the **form**, not the camera hub.

Proven media order in `MarketplaceOfferForm` and Compact Chef/Garden/Designer:

1. **Video** (`VideoUploader`, max 30s, `uploadContext="dish"`)
2. **Photos** (`SimpleImageUploader`, **max 5**)

`wizard-photo` (only when `wizard=1` / legacy) is capture/skip: gallery, camera photo, camera video, continue without media. It does **not** yet hold a photo strip.

**Placement (do not add a required wizard step):**

- Keep one media area. Prefer **Photos first, then Video (optional)** so “filmpje van je foto’s” is natural. If reorder is deferred, put the CTA **in the Video block** with helper copy, still optional.
- Dual CTA: `[ Video uploaden ]` **of** `[ Maak gratis een filmpje van je foto’s ]`.
- Helper: use your photos for a short film with transitions, text and music.
- Skip must stay as easy as today (`continueWithoutMedia` / simply not setting video). Video is **never** required to publish.

**Attach boundary A (wizard, user assembling media now):** after authenticated export, `setVideo({ url, thumbnail, duration })` on the unpublished form is appropriate. That is **not** PX.5.

**Video-only extra photos:** never written to `SimpleImageUploader` / listing images in PX.4A.

---

## Q. Existing-listing integration point

PX.4 already:

owned item → **Maak content** → `/studio/from/homecheff/product/{uuid}` → contextual `Wat wil je maken?`

**PX.4A:** same compositor as wizard. Prefill listing photos from `StudioSourceContext.media`. User may exclude listing photos from the **video** without deleting listing images. Extra uploads are video/Studio only.

**Do not** write `ProductVideo` on a live listing. Export to Studio / download only. Explicit attach = **PX.5**.

Chooser hierarchy: **do not** add a sixth equal PX.3 card. **Do not** bury under Meer/Director/Motion.

Recommended:

```
[ Maak gratis een video van je foto's ]   ← acquisition / easy start (banner)
Wat wil je maken?
  Beeld | Video | Verhaal | Animatie | Bewerken   ← unchanged PX.3 engines
```

Contextual PX.4: same banner; **Video** card stays the existing orchestrator (not silently replaced by the free compositor). Copy review (NL): *Maak gratis een video van je foto's* / *Voeg foto's toe, kies een stijl en muziek en maak in een paar stappen een korte video.*

Optional after preview (not interrupting): Verder bewerken · credit AI actions with **cost before confirm**.

---

## R. Data / schema impact

- **No new Prisma model** in PX.4A.1–.3.
- Anonymous: local composition document + IndexedDB blobs.
- After auth: map onto existing Studio project / publish slideshow **metadata** with a client render flag so nothing accidentally calls Vidu or worker ffmpeg.
- Listing photos vs video-only photos: distinct ids/sources in the composition document (`source: "listing" | "local"`).
- `ProductVideo` write only from item wizard attach (A), never from existing-listing flow (B).

---

## S. Security risks

| Risk | Mitigation |
|------|------------|
| Anonymous abuse of render/storage | No anonymous Blob/worker/generation |
| Malicious images/audio | Reuse Studio/HC type sniffing; do not trust extensions; canvas decode is a natural sandbox |
| Oversized media | Client caps; existing 50 MB video / image working budgets |
| Object URL leaks | Revoke on unmount / draft clear (Instant already does this) |
| Listing ownership | Reuse PX.4 HMAC projection; no query PII |
| Extra photos mutating listing | UI + data source flags; no listing photo API writes |
| Dish MP4 bypass | Composer emits contract-valid MP4 for attach |
| Auth persistence isolation | Draft DB per origin; upload only with session |

---

## T. Copyright / music risks

| Topic | Rule |
|-------|------|
| System / Epidemic / Freesound catalog | **Not proven** for commercial embed in user videos |
| ElevenLabs generated music | Paid; not “gratis” |
| User upload | User warrants rights; shown in UI; we embed in the file, we do not ship a separate track store |
| Silent loop | Forbidden |
| Retention | Local until auth; after auth follow existing Studio/HC blob deletion |
| Ambiguous tracks | Do not ship |

---

## U. Proposed subphase plan

Derived from **actual** gaps (no compositor, no waveform, no public anonymous route, dish MP4 constraint, two HomeCheff entry UIs).

| Subphase | Scope | Ships to users? |
|----------|--------|-----------------|
| **PX.4A.1** | Authoritative duration calculator · canvas compositor · 2–12 photos · pace Kort/Normaal/Rustig · 3 ratios · curated styles · text Titel/Extra/Geen · watermark in preview · remaining time · listing vs local photo flags · tests for duration math | Internal / preview-only OK |
| **PX.4A.2** | Geen muziek + Eigen muziek · segment window = video length · short-track → silence · touch + a11y reorder/segment · lazy waveform | After 4A.1 |
| **PX.4A.3** | Public Studio entry banner (not a 6th intent card) · anonymous local draft · IndexedDB survival · account gate before export · Projecten after login · analytics funnel (no creative payloads) · contextual PX.4 banner | Acquisition funnel |
| **PX.4A.4** | HomeCheff forms: optional CTA on media step · photos-first if we touch order · wizard attach of MP4 · **no** live listing mutation · video-only extras | Seller tool |
| **PX.4A.5** | Client encode certification (Chrome + Safari + iOS) · HomeCheff-valid MP4 · progress/cancel · unsupported-device copy · fallback economics · watermark on file · no credits on free path | Production “free export” |

**Do not** start PX.5 in any subphase.

Free music library = **PX.4A.2b** only after legal sign-off (otherwise never).

---

## Implementation law (after approval)

Choose: **lowest recurring cost, lowest user complexity, highest browser reliability, maximum reuse of existing Studio/HC patterns.**

That is: **canvas compositor + Web Audio + MediaRecorder/WebCodecs**, Instant wizard-style IndexedDB, PX.4 context, existing VideoUploader/Blob **after** auth — **not** a new ffmpeg service and **not** Instant transitions.

---

## Success metrics (instrument in 4A.3+, no media payloads)

Visitor → `free_creator_open` → preview %  
Preview → `account_gate_seen` → signup %  
Account → `export_completed` %  
Return usage % · later credit-feature adoption % (not the north-star)  
HomeCheff wizard → free video adoption %  

Optimize for **useful videos**, not signup-only.

---

## Test plan (later implementation)

2 photos · max photos · duration max · 9:16 / 1:1 / 16:9 · reorder · exclude listing photo · extra video-only photo · styles · text · no/own music · segment start/mid/end · short track → silence · preview without re-encode · watermark · anonymous draft · signup preservation · authenticated save · export · HomeCheff-valid MP4 · wizard attach · existing listing non-mutation · invalid/oversized file · unsupported browser · mobile · **zero credits on free path** · credit upsell labeled · copyright copy.

---

## Target journeys (after ship)

**Item creation:** photos → optional `[Upload]` or `[Maak gratis filmpje]` → listing photos preselected → optional video-only extras → order/style/music/text → preview → create → video on unpublished item → continue wizard.

**Existing item:** Maak content → gratis fotovideo → compose → export. **No live mutation.**

**Studio direct:** Maak gratis een video van je foto's → local compose → preview → account gate → preserve → branded export → optional advanced/AI later.

---

## GO / NO-GO (repeat)

**CONDITIONAL GO** on this architecture. **STOP** for implementation until product approves:

1. Client-primary encode (not Instant, not default worker ffmpeg)  
2. No gratis music library in v1  
3. Wizard attach yes / live listing attach no  
4. Banner above PX.3 intents, not a sixth competing card  
5. Subphase order 4A.1 → .5  

Awaiting approval before any composer code.
