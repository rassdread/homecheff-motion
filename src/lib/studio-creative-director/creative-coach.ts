/**
 * S.6F — Creative Coach suggestions.
 * Optional recommendations only. Never applied automatically.
 * Never mutates Continuity identity, Brand identity, or user intent.
 */

import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type { StudioProductExperienceFamily } from "@/lib/studio-creative-director/types";

export type CreativeCoachSuggestion = {
  id: string;
  label: string;
  category: "visual" | "story" | "platform" | "brand" | "identity_style" | "variation";
  /** Always false — Coach never auto-applies. */
  forced: false;
};

const PACKS: Partial<Record<StudioProductExperienceId, CreativeCoachSuggestion[]>> = {
  BUSINESS_RESTAURANT: [
    { id: "rest_evening_light", label: "evening lighting", category: "visual", forced: false },
    { id: "rest_chef_closeup", label: "chef close-ups", category: "visual", forced: false },
    { id: "rest_steam", label: "steam/smoke food atmosphere", category: "visual", forced: false },
    { id: "rest_customer", label: "customer reactions", category: "story", forced: false },
    { id: "rest_food_closeup", label: "food close-ups", category: "visual", forced: false },
    { id: "rest_vertical", label: "vertical social version", category: "platform", forced: false },
    { id: "rest_commercial", label: "commercial version", category: "variation", forced: false },
    { id: "rest_menu", label: "menu photography", category: "variation", forced: false },
    { id: "rest_bts", label: "behind-the-scenes version", category: "variation", forced: false },
  ],
  BUSINESS_HOMECHEFF: [
    { id: "hc_product", label: "product photography", category: "visual", forced: false },
    { id: "hc_prep", label: "preparation shots", category: "story", forced: false },
    { id: "hc_cook", label: "cooking sequence", category: "story", forced: false },
    { id: "hc_customer", label: "customer experience", category: "story", forced: false },
    { id: "hc_promo", label: "promotional video", category: "variation", forced: false },
    { id: "hc_tiktok", label: "TikTok version", category: "platform", forced: false },
    { id: "hc_reel", label: "Instagram Reel", category: "platform", forced: false },
    { id: "hc_marketplace", label: "Marketplace images", category: "brand", forced: false },
  ],
  PEOPLE_LINKEDIN_PHOTO: [
    { id: "li_attire", label: "business clothing", category: "identity_style", forced: false },
    { id: "li_bg", label: "cleaner background", category: "visual", forced: false },
    { id: "li_posture", label: "better posture", category: "identity_style", forced: false },
    { id: "li_smile", label: "natural smile", category: "identity_style", forced: false },
    { id: "li_brand", label: "company branding", category: "brand", forced: false },
    { id: "li_banner", label: "profile banner", category: "variation", forced: false },
    { id: "li_cv", label: "CV version", category: "variation", forced: false },
  ],
  PEOPLE_CV_PHOTO: [
    { id: "cv_clean", label: "clean neutral background", category: "visual", forced: false },
    { id: "cv_attire", label: "professional attire", category: "identity_style", forced: false },
    { id: "cv_smile", label: "approachable smile", category: "identity_style", forced: false },
  ],
  PEOPLE_BUSINESS_PORTRAIT: [
    { id: "bp_light", label: "soft key lighting", category: "visual", forced: false },
    { id: "bp_brand", label: "subtle brand colors", category: "brand", forced: false },
    { id: "bp_posture", label: "confident posture", category: "identity_style", forced: false },
  ],
  PEOPLE_DATING_PROFILE: [
    { id: "dt_pose", label: "natural pose", category: "identity_style", forced: false },
    { id: "dt_outdoor", label: "outdoor lighting", category: "visual", forced: false },
    { id: "dt_casual", label: "casual clothing", category: "identity_style", forced: false },
    { id: "dt_smile", label: "genuine smile", category: "identity_style", forced: false },
    { id: "dt_variant", label: "profile variation", category: "variation", forced: false },
    { id: "dt_starter", label: "conversation starter photos", category: "variation", forced: false },
  ],
  PEOPLE_WEDDING: [
    { id: "wd_sunset", label: "cinematic sunset", category: "visual", forced: false },
    { id: "wd_closeup", label: "emotional close-ups", category: "visual", forced: false },
    { id: "wd_family", label: "family moments", category: "story", forced: false },
    { id: "wd_romantic", label: "romantic lighting", category: "visual", forced: false },
    { id: "wd_luxury", label: "luxury version", category: "variation", forced: false },
    { id: "wd_reel", label: "social highlight reel", category: "platform", forced: false },
  ],
};

const FAMILY_FALLBACK: Record<StudioProductExperienceFamily, CreativeCoachSuggestion[]> = {
  PEOPLE: [
    { id: "people_natural", label: "natural expression", category: "identity_style", forced: false },
    { id: "people_light", label: "flattering lighting", category: "visual", forced: false },
  ],
  BUSINESS: [
    { id: "biz_brand", label: "clear brand presence", category: "brand", forced: false },
    { id: "biz_social", label: "social-ready crop", category: "platform", forced: false },
  ],
  SOCIAL: [
    { id: "soc_hook", label: "strong opening hook", category: "story", forced: false },
    { id: "soc_vertical", label: "vertical framing", category: "platform", forced: false },
  ],
  CREATIVE: [
    { id: "cre_arc", label: "clear story arc", category: "story", forced: false },
    { id: "cre_shot", label: "varied shot sizes", category: "visual", forced: false },
  ],
  IDENTITY: [
    { id: "id_preserve", label: "preserve identity references", category: "identity_style", forced: false },
    { id: "id_consistency", label: "keep continuity strength high", category: "identity_style", forced: false },
  ],
};

/**
 * Optional coach suggestions for an experience.
 * Never forced; never writes identity Continuity fields.
 */
export function getCreativeCoachSuggestions(input: {
  experienceId: StudioProductExperienceId;
  family: StudioProductExperienceFamily;
  limit?: number;
}): CreativeCoachSuggestion[] {
  const limit = input.limit ?? 12;
  const pack = PACKS[input.experienceId] ?? FAMILY_FALLBACK[input.family] ?? [];
  return pack.slice(0, limit).map((s) => ({ ...s, forced: false as const }));
}

export function assertCoachSuggestionsNeverForced(
  suggestions: CreativeCoachSuggestion[]
): boolean {
  return suggestions.every((s) => s.forced === false);
}
