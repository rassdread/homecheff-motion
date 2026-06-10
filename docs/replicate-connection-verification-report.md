# Replicate Connection Verification Report

Sprint date: 2026-06-10

## Goal

Verify HomeCheff can communicate with Replicate and receive real SAM3 segmentation results **before** building the Segmentation Benchmark Lab.

**Out of scope:** Editor, Studio, Motion integration; benchmark system; additional providers.

## Route

| Item | Value |
|------|-------|
| Page | `/admin/ai-lab/replicate` |
| Status API | `GET /api/admin/ai-lab/replicate/status` |
| Run API | `POST /api/admin/ai-lab/replicate/run` |
| Access | Admin only (`requireAdmin`) |

## Environment

```bash
REPLICATE_API_TOKEN=r8_...
```

Documented in `.env.example`. When missing, the page shows **"Replicate is not configured"** — no thrown errors.

## Model

Single provider for this sprint:

```
yodagg/sam3-image-seg
```

Inputs: `image` (data URI), `prompt`, `return_polygons`, `visualize_output`.

Outputs used: `pred_masks`, `pred_polygons`, `pred_boxes`, `pred_scores`, `visualization`.

## Page Sections

1. **Connection status** — configured, billing, model reachable, last test runtime (green/red badges)
2. **Image upload** — PNG/JPG/WEBP preview (session-only, no persistent storage)
3. **Prompt** — examples: globe, logo, person, face, background, clothes, shoe, plant, food (default: person)
4. **Model** — `yodagg/sam3-image-seg`
5. **Run test** — POST to Replicate, poll until complete (up to 120s)
6. **Results** — mask, overlay, bounding box, polygon JSON, confidence, runtime, estimated cost, raw response (collapsible)
7. **Debug** — model, prediction ID, execution time, status, response size

## Verification Steps

1. Set `REPLICATE_API_TOKEN` in `.env.local` (local) or Vercel env (production).
2. Sign in as admin → open `/admin/ai-lab/replicate`.
3. Confirm connection badges (configured + billing + model reachable).
4. Upload **Globe Man** image → prompt `globe` → **Run test** → mask + confidence + polygon.
5. Same image → prompt `person` → full character mask.
6. Upload **mascot** → prompt `logo` → logo mask if detected.

## Error Handling

Human-readable only (no stack traces):

| Condition | Message |
|-----------|---------|
| Missing token | Replicate is not configured |
| 402 / billing | Billing may not be configured. |
| 404 model | Model unavailable. |
| Bad image / 422 | Replicate could not process this image. |
| Prediction failed | Replicate could not process this image. |

## Test Result

| Check | Status |
|-------|--------|
| Admin page + nav link | Added |
| Status + run API routes | Added |
| `replicate-client.ts` + `replicate-sam3-seg.ts` | Added |
| `.env.example` | Updated |
| i18n en/nl | Added |
| Editor / Studio / Motion | Unchanged |
| Automated contract tests | `replicate-connection-verification.test.ts` |
| Live Globe Man / mascot runs | **Manual** — operator uploads test assets in admin lab |

## Next Sprint

Only after live verification succeeds:

**HomeCheff Segmentation Benchmark Lab**
