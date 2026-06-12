# Infrastructure Cost Audit

Audit date: 2026-06-10  
Scope: monthly cost **estimates** for architecture scenarios.  
Basis: codebase billing constants + public list pricing where cited. **Not** live billing dashboards.

Constants verified in code:

| Constant | Value | Source |
|----------|-------|--------|
| Vidu credit USD | $0.005 / credit | `src/lib/animation-presets.ts`, `credit-cost.ts` |
| OpenAI OCR estimate | $0.012 / call | `render-analytics-cost.ts` |
| Internal merge estimate | $0.001 / job | `render-analytics-cost.ts` |
| Blob storage | $0.15 / GB / month | `blob-storage-pricing.ts` |
| Infra baseline (analytics) | $20 / month | `render-analytics-cost.ts` |
| Replicate SAM3 estimate | ~$0.01 / run | `replicate-client.ts` |

---

## Scenario definitions

| Scenario | Components |
|----------|------------|
| **A — Current (documented)** | Vercel app + Render video worker + optional Render/Railway merge worker + optional REMBG host + Vidu + Blob + Neon |
| **B — Vercel-only** | Vercel app + Vidu + Blob + DB — **no workers** (Instant Premium merge broken; classic export broken) |
| **C — Vercel + Replicate** | B + Replicate for segmentation (replace/add SAM2/REMBG calls from Vercel) |
| **D — Vercel + Replicate + Worker** | C + one video worker host (Render or Railway) — **recommended minimum for full Motion on Vercel** |

---

## Fixed / platform costs (monthly ranges)

| Line item | Current (A) | Vercel-only (B) | Vercel+Replicate (C) | Vercel+Rep+Worker (D) |
|-----------|-------------|-----------------|----------------------|------------------------|
| **Vercel Pro (app)** | ~$20/user + usage | Same | Same | Same |
| **Vercel build minutes** | High (every push) | Same | Same | Same |
| **Render web service (video worker)** | ~$7–25+ starter+ | $0 | $0 | ~$7–25+ |
| **Render pipeline minutes** | **Risk: quota exhaustion** (1003/1000 reported) | $0 | $0 | Low if auto-deploy OFF |
| **Render/Railway merge worker** | ~$5–20 if classic export live | $0 | $0 | $0–20 (classic only) |
| **REMBG host** | ~$7–15 if on Render starter | $0 | $0 (if Replicate replaces) | $0–15 |
| **Neon / Postgres** | ~$0–19+ (usage) | Same | Same | Same |
| **Vercel Blob storage** | $0.15/GB/mo + egress $0.15/GB | Same | Same + mask PNGs | Same |

**Render pipeline overage:** when included minutes exceeded, builds block — **indirect cost** = stale worker + failed deploys (not a line item in code).

---

## Variable costs — motion (Vidu)

From `docs/motion-studio-economics-audit.md` (verified presets):

| Mode | Jobs | Typical credits (preset-driven) | USD @ $0.005/cr |
|------|------|-----------------------------------|-----------------|
| Transition IP, 3 images | 2 segments | ~40–80 credits (tier-dependent) | **$0.20–$0.40** / render |
| Story IP, 5 scenes | 1 multiframe | higher duration multiplier | **~$0.50–$2+** / render |
| Classic animate | N−1 transitions | preset table | similar order |

**100 Instant Premium renders/month (mid tier):** ~**$30–$80** Vidu COGS (wide band; exact when balance delta logged).

Worker/host FFmpeg: **~$0.001/job** internal estimate — negligible vs Vidu.

---

## Variable costs — segmentation

| Provider | Per operation | 1000 ops/mo | In scenario |
|----------|---------------|-------------|-------------|
| **REMBG self-hosted** | Compute on $7–15/mo instance | Flat + CPU | A, D if kept |
| **SAM2 external GPU** | Unknown (not in repo) | **Unknown** | A if `SAM2_SEGMENTATION_URL` set |
| **Replicate SAM3** | ~$0.01/run (code estimate) | **~$10** | C, D |
| **Heuristic** | $0 | $0 | All (fallback) |

**Editor-heavy month** (500 rembg + 200 SAM2): self-hosted REMBG often cheaper than 700× $0.01 Replicate (**$7**). Break-even depends on GPU host vs Replicate volume.

---

## Variable costs — build

| Platform | Cost driver | Current pain |
|----------|-------------|--------------|
| **Vercel** | `next build` per push | Moderate; necessary for UI |
| **Render worker** | `npm ci` + RT-DETR download + `next build` in Docker | **High** — runs on **every** auto-deploy commit |
| **Merge worker** | `tsc` + small image | Lower than video worker |
| **REMBG** | Docker Python image | Medium; separate lifecycle |

**Estimated Render pipeline burn:** 10–20 min/build × N commits/month. At quota 1000 min, **~50–100 worker builds/month** exhausts included tier.

**Savings:** disable Render auto-deploy → **~$0 pipeline** until manual deploy (operational tradeoff).

---

## Variable costs — runtime (non-Vidu)

| Service | Metered in app? | Typical COGS |
|---------|-----------------|--------------|
| OpenAI OCR / vision | Partial ($0.012 OCR estimate) | $0.01–$0.05 / IP project with OCR |
| ElevenLabs TTS | Planning only | Not in `ProviderCostEvent` |
| DALL·E scene images | Planning €0.04 | Studio usage |
| Stripe | % of GMV | Instant Premium checkout |
| Replicate (admin lab) | Manual | Low volume |

---

## Scenario comparison table (monthly, illustrative)

Assumptions: 1 production app, 50 IP renders, 10 classic exports, 200 Editor segments, 20 GB Blob, low traffic DB.

| Category | A Current | B Vercel-only | C Vercel+Replicate | D Vercel+Rep+Worker |
|----------|-----------|---------------|--------------------|--------------------|
| **Platform fixed** | $45–80 | $25–45 | $25–45 | $45–80 |
| **Build/pipeline** | $0–overage | Low | Low | Low (worker manual deploy) |
| **Vidu motion** | $15–40 | $15–40 | $15–40 | $15–40 |
| **Segmentation** | $7–15 (REMBG host) | $0 (heuristic only) | $2–5 (Replicate) | $2–15 |
| **FFmpeg compute** | Included in worker | **Broken** | **Broken** | Included in worker |
| **Blob** | ~$3 | ~$3 | ~$3.5 | ~$3.5 |
| **Total (illustrative)** | **$70–150** | **$43–88** (incomplete product) | **$45–93** (no final MP4 on Vercel) | **$65–140** |

---

## Cheapest **viable** production architecture

**Not** Vercel-only — Instant Premium and classic export **require** FFmpeg off serverless.

### Recommended cost-optimized stack

| Layer | Choice | Why |
|-------|--------|-----|
| App | **Vercel** | Already primary; ships UI |
| Video worker | **One** small always-on instance (Railway/Render/Fly) | Required for IP merge; **manual deploy** |
| Classic merge | **Drop** if classic export traffic is zero → remove merge worker cost | Code still supports classic — product decision |
| Segmentation | **Replicate SAM3** at low volume OR **single REMBG** container | Avoid SAM2 GPU host until needed |
| Builds | **Disable** worker auto-deploy on Render | Stops pipeline minute fire |
| Blob + DB | Keep Vercel Blob + Neon | Already integrated |

### Cheapest **non-viable** stack

Vercel-only saves worker fixed cost but **breaks** final video delivery for production Motion — not acceptable for HomeCheff Studio.

---

## Cost risks (verified from sprint context)

1. **Render pipeline quota** — blocks deploys; app on Vercel updates while worker stagnates → mismatch bugs appear as "deploy failures."
2. **Duplicate workers** — paying Render + Railway for same role.
3. **Unmetered ElevenLabs / OpenAI** — COGS underreported in admin analytics (`motion-studio-economics-audit.md`).
4. **REMBG + Replicate + SAM2** — triple segmentation hosts if all env vars set.

---

## Monitoring gaps

| Metric | Instrumented? |
|--------|---------------|
| Vidu credits | **Yes** (balance delta when API works) |
| FFmpeg merge | Flat $0.001 estimate |
| Replicate | Admin lab only |
| REMBG / SAM2 | **No** per-call cost events |
| Render/Railway host | **No** in app |
| Vercel build minutes | **No** in app |

---

## Related docs

- `docs/motion-studio-economics-audit.md` — provider COGS detail
- `docs/motion-studio-pricing-monetization-audit.md` — customer pricing vs COGS
- `infrastructure-cleanup-plan.md` — cost-driven removals
