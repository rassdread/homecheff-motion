/**
 * SHARED_PURE — Studio credit constants safe for client and server.
 *
 * Financial SSOT for fusion intent render overrides and USD conversion.
 * Server billing still validates via STUDIO_ACTION_COST_REGISTRY + overrideCredits.
 * Do not put secrets, Prisma, or Node built-ins here.
 */

import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

/** Margin multiplier applied to reserved cost when converting to credits. */
export const CREDIT_MARGIN_MULTIPLIER = 2.5;

/** USD per credit unit for pricing conversion */
export const USD_PER_CREDIT = 0.005;

/**
 * Registry default for actionType `fusion_render` when no intent override is supplied.
 * Kept in sync with STUDIO_ACTION_COST_REGISTRY.fusion_render.defaultCreditCost.
 */
export const FUSION_RENDER_ACTION_DEFAULT_CREDITS = 25;

/** Fallback when an intent is missing from the per-intent map. */
export const FUSION_INTENT_RENDER_FALLBACK_CREDITS = 20;

/**
 * Per-fusion-intent render credits — charged via overrideCredits on fusion render paths.
 * Values must not change without an explicit financial decision.
 */
export const FUSION_INTENT_RENDER_CREDITS: Partial<Record<EditorFusionIntent, number>> = {
  character_fusion: 25,
  animal_human_fusion: 25,
  genetic_blend: 35,
  future_child: 35,
  human_into_mascot: 20,
  mascot_into_human: 20,
  character_upgrade: 15,
  character_role_variant: 15,
  outfit_from_reference: 15,
  person_outfit: 15,
  person_background: 15,
  product_branding: 20,
  product_packaging: 20,
  product_family: 25,
  life_timeline: 50,
  how_will_i_look: 15,
  product_environment: 15,
  ad_composition: 20,
  poster_composition: 20,
  campaign_variant: 25,
};

export function usdToCredits(usd: number, minimum = 1): number {
  const raw = Math.ceil((usd * CREDIT_MARGIN_MULTIPLIER) / USD_PER_CREDIT);
  return Math.max(minimum, raw);
}

export function fusionIntentRenderCredits(intent: EditorFusionIntent): number {
  return FUSION_INTENT_RENDER_CREDITS[intent] ?? FUSION_INTENT_RENDER_FALLBACK_CREDITS;
}
