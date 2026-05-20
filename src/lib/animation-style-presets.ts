/**
 * Creator-facing animation styles — one card configures all hidden pipeline settings.
 */

import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { CameraPresetId } from "@/lib/premium-camera-presets";
import type { FxPresetId } from "@/lib/premium-fx-presets";
import type { ComicStoryPresetId } from "@/lib/premium-comic-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { PremiumPolishPresetId } from "@/lib/premium-polish-presets";
import type { SegmentationProvider } from "@/lib/premium-foreground-segmentation";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import type { FinalAssemblyMode } from "@/server/instant-premium/final-assembly";
import type { SegmentTransitionType } from "@/lib/segment-transition-types";
import type { InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";

export type AnimationStyleId =
  | "cartoon_animation"
  | "product_showcase"
  | "character_animation"
  | "marketplace_story"
  | "clean_motion"
  | "fast_social_animation";

export const DEFAULT_ANIMATION_STYLE_ID: AnimationStyleId = "cartoon_animation";

export const ANIMATION_STYLE_IDS: readonly AnimationStyleId[] = [
  "cartoon_animation",
  "product_showcase",
  "character_animation",
  "marketplace_story",
  "clean_motion",
  "fast_social_animation",
] as const;

/** auto_detect = resolved at runtime via scene intelligence */
export type EmotionalPresetSetting = EmotionalActingPresetId | "auto_detect";

export type AnimationStyleConfig = {
  id: AnimationStyleId;
  labelKey: string;
  descriptionKey: string;
  bestForKey: string;
  iconTone: "violet" | "amber" | "emerald" | "sky" | "zinc" | "rose";
  stylePreset: InstantPremiumStylePreset;
  motionEnergy: MotionEnergy;
  emotionalActingPreset: EmotionalPresetSetting;
  segmentTransitionType: SegmentTransitionType;
  cameraPreset: CameraPresetId;
  fxPreset: FxPresetId;
  assemblyMode: FinalAssemblyMode;
  comicPreset?: ComicStoryPresetId;
  segmentationProvider: SegmentationProvider;
  textPreservation: boolean;
  minimalCompositorPolish: boolean;
  /** Hidden poster toggles */
  animateMascot: boolean;
  animateProduct: boolean;
  animateForegroundOnly: boolean;
  preserveAllText: boolean;
  cinematicCameraMotion: boolean;
  particlesGlow: boolean;
  posterMotionBlendStrength?: number;
  /** Maps to legacy DB field for backward compatibility */
  legacyPremiumPresetId: PremiumPolishPresetId;
};

export const ANIMATION_STYLE_PRESETS: Record<AnimationStyleId, AnimationStyleConfig> = {
  cartoon_animation: {
    id: "cartoon_animation",
    labelKey: "instant.animationStyle.cartoon.title",
    descriptionKey: "instant.animationStyle.cartoon.desc",
    bestForKey: "instant.animationStyle.cartoon.bestFor",
    iconTone: "violet",
    stylePreset: "food_promo",
    motionEnergy: "expressive",
    emotionalActingPreset: "auto_detect",
    segmentTransitionType: "capcut_smooth",
    cameraPreset: "calm_drift",
    fxPreset: "social_energy",
    assemblyMode: "raw_motion_concat",
    comicPreset: "mascot_seller",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    animateMascot: true,
    animateProduct: true,
    animateForegroundOnly: true,
    preserveAllText: true,
    cinematicCameraMotion: true,
    particlesGlow: true,
    posterMotionBlendStrength: 0.12,
    legacyPremiumPresetId: "homecheff_mascot_promo",
  },
  product_showcase: {
    id: "product_showcase",
    labelKey: "instant.animationStyle.product.title",
    descriptionKey: "instant.animationStyle.product.desc",
    bestForKey: "instant.animationStyle.product.bestFor",
    iconTone: "amber",
    stylePreset: "clean_business",
    motionEnergy: "cinematic",
    emotionalActingPreset: "confident_presenter",
    segmentTransitionType: "capcut_smooth",
    cameraPreset: "dramatic_reveal",
    fxPreset: "luxury_glow",
    assemblyMode: "raw_motion_concat",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: true,
    animateMascot: false,
    animateProduct: true,
    animateForegroundOnly: true,
    preserveAllText: true,
    cinematicCameraMotion: true,
    particlesGlow: true,
    posterMotionBlendStrength: 0.1,
    legacyPremiumPresetId: "luxury_glow",
  },
  character_animation: {
    id: "character_animation",
    labelKey: "instant.animationStyle.character.title",
    descriptionKey: "instant.animationStyle.character.desc",
    bestForKey: "instant.animationStyle.character.bestFor",
    iconTone: "emerald",
    stylePreset: "social_boost",
    motionEnergy: "expressive",
    emotionalActingPreset: "playful_mascot",
    segmentTransitionType: "capcut_smooth",
    cameraPreset: "calm_drift",
    fxPreset: "glow",
    assemblyMode: "raw_motion_concat",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    animateMascot: true,
    animateProduct: false,
    animateForegroundOnly: true,
    preserveAllText: true,
    cinematicCameraMotion: true,
    particlesGlow: false,
    posterMotionBlendStrength: 0.18,
    legacyPremiumPresetId: "comic_story",
  },
  marketplace_story: {
    id: "marketplace_story",
    labelKey: "instant.animationStyle.marketplace.title",
    descriptionKey: "instant.animationStyle.marketplace.desc",
    bestForKey: "instant.animationStyle.marketplace.bestFor",
    iconTone: "sky",
    stylePreset: "clean_business",
    motionEnergy: "cinematic",
    emotionalActingPreset: "energetic_creator",
    segmentTransitionType: "capcut_smooth",
    cameraPreset: "parallax",
    fxPreset: "dust",
    assemblyMode: "raw_motion_concat",
    comicPreset: "marketplace_promo",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    animateMascot: true,
    animateProduct: true,
    animateForegroundOnly: true,
    preserveAllText: true,
    cinematicCameraMotion: true,
    particlesGlow: true,
    posterMotionBlendStrength: 0.14,
    legacyPremiumPresetId: "marketplace_poster",
  },
  clean_motion: {
    id: "clean_motion",
    labelKey: "instant.animationStyle.clean.title",
    descriptionKey: "instant.animationStyle.clean.desc",
    bestForKey: "instant.animationStyle.clean.bestFor",
    iconTone: "zinc",
    stylePreset: "clean_business",
    motionEnergy: "calm",
    emotionalActingPreset: "confident_presenter",
    segmentTransitionType: "capcut_smooth",
    cameraPreset: "none",
    fxPreset: "none",
    assemblyMode: "raw_motion_concat",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    animateMascot: true,
    animateProduct: true,
    animateForegroundOnly: true,
    preserveAllText: true,
    cinematicCameraMotion: false,
    particlesGlow: false,
    posterMotionBlendStrength: 0.08,
    legacyPremiumPresetId: "app_showcase",
  },
  fast_social_animation: {
    id: "fast_social_animation",
    labelKey: "instant.animationStyle.fastSocial.title",
    descriptionKey: "instant.animationStyle.fastSocial.desc",
    bestForKey: "instant.animationStyle.fastSocial.bestFor",
    iconTone: "rose",
    stylePreset: "social_boost",
    motionEnergy: "viral",
    emotionalActingPreset: "energetic_creator",
    segmentTransitionType: "capcut_smooth",
    cameraPreset: "punch_in",
    fxPreset: "social_energy",
    assemblyMode: "raw_motion_concat",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    animateMascot: true,
    animateProduct: true,
    animateForegroundOnly: true,
    preserveAllText: true,
    cinematicCameraMotion: true,
    particlesGlow: true,
    posterMotionBlendStrength: 0.16,
    legacyPremiumPresetId: "affiliate_product_ad",
  },
};

const LEGACY_PREMIUM_TO_STYLE: Partial<Record<PremiumPolishPresetId, AnimationStyleId>> = {
  homecheff_mascot_promo: "cartoon_animation",
  affiliate_product_ad: "fast_social_animation",
  comic_story: "character_animation",
  marketplace_poster: "marketplace_story",
  app_showcase: "clean_motion",
  luxury_glow: "product_showcase",
};

export function isAnimationStyleId(value: string): value is AnimationStyleId {
  return (ANIMATION_STYLE_IDS as readonly string[]).includes(value);
}

export function normalizeAnimationStyleId(value: unknown): AnimationStyleId {
  if (typeof value === "string" && isAnimationStyleId(value.trim())) {
    return value.trim() as AnimationStyleId;
  }
  return DEFAULT_ANIMATION_STYLE_ID;
}

export function animationStyleFromLegacyPremiumPreset(
  premiumPresetId: PremiumPolishPresetId
): AnimationStyleId {
  return LEGACY_PREMIUM_TO_STYLE[premiumPresetId] ?? DEFAULT_ANIMATION_STYLE_ID;
}

export function getAnimationStyle(id: AnimationStyleId): AnimationStyleConfig {
  return ANIMATION_STYLE_PRESETS[id] ?? ANIMATION_STYLE_PRESETS[DEFAULT_ANIMATION_STYLE_ID];
}

/** Apply full hidden pipeline config from a creator-facing style card. */
export function applyAnimationStyleToPosterSettings(
  styleId: AnimationStyleId,
  existing?: Partial<PosterMotionSettings>
): PosterMotionSettings {
  const style = getAnimationStyle(styleId);
  return {
    version: 1,
    floatingGeneratedObject: false,
    ...existing,
    animationStyleId: styleId,
    premiumPresetId: style.legacyPremiumPresetId,
    motionEnergy: style.motionEnergy,
    segmentTransitionType: style.segmentTransitionType,
    cameraPreset: style.cameraPreset,
    fxPreset: style.fxPreset,
    comicPreset: style.comicPreset,
    segmentationProvider: style.segmentationProvider,
    textPreservation: style.textPreservation,
    minimalCompositorPolish: style.minimalCompositorPolish,
    animateMascot: style.animateMascot,
    animateProduct: style.animateProduct,
    animateForegroundOnly: style.animateForegroundOnly,
    preserveAllText: style.preserveAllText,
    cinematicCameraMotion: style.cinematicCameraMotion,
    particlesGlow: style.particlesGlow,
    posterMotionBlendStrength: style.posterMotionBlendStrength,
    emotionalActingPreset:
      style.emotionalActingPreset === "auto_detect"
        ? undefined
        : style.emotionalActingPreset,
  };
}

export function resolveAnimationStyleIdFromSettings(
  settings: PosterMotionSettings | unknown
): AnimationStyleId {
  if (!settings || typeof settings !== "object") {
    return DEFAULT_ANIMATION_STYLE_ID;
  }
  const o = settings as Record<string, unknown>;
  if (typeof o.animationStyleId === "string" && isAnimationStyleId(o.animationStyleId.trim())) {
    return o.animationStyleId.trim() as AnimationStyleId;
  }
  if (typeof o.premiumPresetId === "string") {
    const legacy = o.premiumPresetId.trim() as PremiumPolishPresetId;
    if (legacy in LEGACY_PREMIUM_TO_STYLE) {
      return animationStyleFromLegacyPremiumPreset(legacy);
    }
  }
  return DEFAULT_ANIMATION_STYLE_ID;
}
