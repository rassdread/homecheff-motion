/**
 * Inspiration shortcuts for AI-first Studio home.
 * LIVE / free capabilities only — role = prefill intent, not workflow gate.
 */

import type { TranslationKey } from "@/i18n";
import { buildExperiencePackHref } from "@/lib/studio-creative-director/consumer-href";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type { StudioIntentRecommendedPipeline } from "@/types/studio-intent-plan";

export type StudioAiHomeInspirationId =
  | "photo_video"
  | "product_photo"
  | "advertisement"
  | "social_video"
  | "animation"
  | "story"
  | "logo"
  | "presentation";

export type StudioAiHomeInspiration = {
  id: StudioAiHomeInspirationId;
  titleKey: TranslationKey;
  prefillKey: TranslationKey;
  pipeline: StudioIntentRecommendedPipeline;
  experienceId?: StudioProductExperienceId;
  free?: boolean;
  billingActionType: string | null;
};

/** Curated chips mapped to real LIVE/free Studio capabilities. */
export const STUDIO_AI_HOME_INSPIRATION: readonly StudioAiHomeInspiration[] = [
  {
    id: "photo_video",
    titleKey: "studio.aiHome.inspiration.photoVideo.title",
    prefillKey: "studio.aiHome.inspiration.photoVideo.prefill",
    pipeline: "photo_video",
    free: true,
    billingActionType: null,
  },
  {
    id: "product_photo",
    titleKey: "studio.aiHome.inspiration.productPhoto.title",
    prefillKey: "studio.aiHome.inspiration.productPhoto.prefill",
    pipeline: "editor",
    experienceId: "BUSINESS_PRODUCT",
    billingActionType: "image_edit",
  },
  {
    id: "advertisement",
    titleKey: "studio.aiHome.inspiration.advertisement.title",
    prefillKey: "studio.aiHome.inspiration.advertisement.prefill",
    pipeline: "quick_ad",
    experienceId: "BUSINESS_COMMERCIAL",
    billingActionType: "publish_photo_story",
  },
  {
    id: "social_video",
    titleKey: "studio.aiHome.inspiration.socialVideo.title",
    prefillKey: "studio.aiHome.inspiration.socialVideo.prefill",
    pipeline: "experience",
    experienceId: "SOCIAL_REELS",
    billingActionType: "studio_orchestrator_production",
  },
  {
    id: "animation",
    titleKey: "studio.aiHome.inspiration.animation.title",
    prefillKey: "studio.aiHome.inspiration.animation.prefill",
    pipeline: "motion",
    experienceId: "CREATIVE_ANIMATION",
    billingActionType: "motion_render",
  },
  {
    id: "story",
    titleKey: "studio.aiHome.inspiration.story.title",
    prefillKey: "studio.aiHome.inspiration.story.prefill",
    pipeline: "experience",
    experienceId: "CREATIVE_STORYBOARD",
    billingActionType: "scene_generation",
  },
  {
    id: "logo",
    titleKey: "studio.aiHome.inspiration.logo.title",
    prefillKey: "studio.aiHome.inspiration.logo.prefill",
    pipeline: "editor",
    experienceId: "BUSINESS_LOGO_PLACEMENT",
    billingActionType: "fusion_render",
  },
  {
    id: "presentation",
    titleKey: "studio.aiHome.inspiration.presentation.title",
    prefillKey: "studio.aiHome.inspiration.presentation.prefill",
    pipeline: "experience",
    experienceId: "CREATIVE_PRESENTATION",
    billingActionType: "studio_orchestrator_production",
  },
] as const;

export function studioAiHomeInspiration(
  id: StudioAiHomeInspirationId
): StudioAiHomeInspiration {
  const row = STUDIO_AI_HOME_INSPIRATION.find((entry) => entry.id === id);
  if (!row) {
    throw new Error(`Unknown Studio AI home inspiration: ${id}`);
  }
  return row;
}

export function inspirationExperienceHref(
  experienceId: StudioProductExperienceId,
  idea?: string
): string {
  const base = buildExperiencePackHref({ experienceId, mode: "QUICK" });
  if (!idea?.trim()) return base;
  const url = new URL(base, "https://homecheff.local");
  url.searchParams.set("idea", idea.trim().slice(0, 500));
  return `${url.pathname}?${url.searchParams.toString()}`;
}
