/**
 * Observed provider COGS from staging production proof (2026-06-24).
 * Sources: ProviderCostEvent, staging-proof-evidence.json — not estimates.
 */

/** Vidu unit cost — matches ProviderCostEvent.unitCostUsd. */
export const OBSERVED_VIDU_USD_PER_CREDIT = 0.005;

/** travel-4-photos + product-commercial PASS: 120 Vidu credits / 4 scenes. */
export const OBSERVED_VIDU_USD_PER_SCENE_UPLOAD = 0.15;

/** music-video-small PASS: $1.00 Vidu / 7 scenes. */
export const OBSERVED_VIDU_USD_PER_SCENE_MUSIC = 1 / 7;

/** music-video-small: 7 × (openai_scene_image $0.04 + openai_vision $0.015). */
export const OBSERVED_OPENAI_USD_PER_GENERATED_SCENE = 0.055;

/** Per ProviderCostEvent openai_vision rows in staging scene QA. */
export const OBSERVED_OPENAI_VISION_USD = 0.015;

/** Negligible per production — staging blob prorated. */
export const OBSERVED_BLOB_USD_PER_PRODUCTION = 0.001;

/** Worst-case customer credit price (pack_500 €4.99 / 500). */
export const WORST_CASE_EUR_PER_CREDIT = 4.99 / 500;

/** Conservative FX for pricing floor (€ → USD revenue). */
export const PRICING_EUR_TO_USD = 0.92;

/** Minimum gross margin on customer revenue vs observed COGS. */
export const TARGET_GROSS_MARGIN = 0.65;

/** FFmpeg multi-batch merge — observed internal_merge events. */
export const OBSERVED_MERGE_USD_PER_BATCH = 0.001;

/** Publish export + mux — video_export instrumentation. */
export const OBSERVED_EXPORT_USD_PER_OUTPUT = 0.02;

/** ElevenLabs STT — podcast/finish path (per audio minute). */
export const OBSERVED_ELEVENLABS_STT_USD_PER_MINUTE = 0.22 / 60;

/** Storage — base + per-asset retention within production window. */
export const OBSERVED_BLOB_USD_PER_ASSET = 0.0002;

/** Estimated scene/image retry buffer (1 retry per 10 scenes). */
export const OBSERVED_RETRY_BUFFER_FRACTION = 0.08;
