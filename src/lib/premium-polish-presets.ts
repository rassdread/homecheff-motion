import type { FinalAssemblyMode } from "@/server/instant-premium/final-assembly";
import type { SegmentTransitionType } from "@/lib/segment-transition-types";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { CameraPresetId } from "@/lib/premium-camera-presets";
import type { FxPresetId } from "@/lib/premium-fx-presets";
import type { ComicStoryPresetId } from "@/lib/premium-comic-presets";
import type { SegmentationProvider } from "@/lib/premium-foreground-segmentation";

export type PremiumPolishPresetId =
  | "homecheff_mascot_promo"
  | "affiliate_product_ad"
  | "comic_story"
  | "marketplace_poster"
  | "app_showcase"
  | "luxury_glow";

export const DEFAULT_PREMIUM_POLISH_PRESET_ID: PremiumPolishPresetId = "homecheff_mascot_promo";

export type PremiumPolishPresetConfig = {
  id: PremiumPolishPresetId;
  labelKey: string;
  descriptionKey: string;
  stylePreset: "food_promo" | "clean_business" | "social_boost";
  motionEnergy: MotionEnergy;
  transitionType: SegmentTransitionType;
  assemblyMode: FinalAssemblyMode;
  cameraPreset: CameraPresetId;
  fxPreset: FxPresetId;
  comicPreset?: ComicStoryPresetId;
  segmentationProvider: SegmentationProvider;
  textPreservation: boolean;
  minimalCompositorPolish: boolean;
  characterMotion?: {
    emotion: string;
    personality: string;
    motionStyle: string;
  };
};

export const PREMIUM_POLISH_PRESETS: Record<PremiumPolishPresetId, PremiumPolishPresetConfig> = {
  homecheff_mascot_promo: {
    id: "homecheff_mascot_promo",
    labelKey: "instant.premiumPreset.homecheffMascotPromo.title",
    descriptionKey: "instant.premiumPreset.homecheffMascotPromo.desc",
    stylePreset: "food_promo",
    motionEnergy: "expressive",
    transitionType: "capcut_smooth",
    assemblyMode: "raw_motion_concat",
    cameraPreset: "calm_drift",
    fxPreset: "social_energy",
    comicPreset: "mascot_seller",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    characterMotion: {
      emotion: "warm and enthusiastic",
      personality: "friendly chef mascot presenter",
      motionStyle: "cinematic social media host",
    },
  },
  affiliate_product_ad: {
    id: "affiliate_product_ad",
    labelKey: "instant.premiumPreset.affiliateProductAd.title",
    descriptionKey: "instant.premiumPreset.affiliateProductAd.desc",
    stylePreset: "social_boost",
    motionEnergy: "energetic",
    transitionType: "capcut_smooth",
    assemblyMode: "raw_motion_concat",
    cameraPreset: "punch_in",
    fxPreset: "glow",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    characterMotion: {
      emotion: "confident",
      personality: "affiliate product presenter",
      motionStyle: "premium short-form ad",
    },
  },
  comic_story: {
    id: "comic_story",
    labelKey: "instant.premiumPreset.comicStory.title",
    descriptionKey: "instant.premiumPreset.comicStory.desc",
    stylePreset: "social_boost",
    motionEnergy: "expressive",
    transitionType: "capcut_smooth",
    assemblyMode: "raw_motion_concat",
    cameraPreset: "comic_zoom",
    fxPreset: "comic_lines",
    comicPreset: "comic_motion",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    characterMotion: {
      emotion: "dramatic",
      personality: "comic panel character",
      motionStyle: "manga-inspired acting",
    },
  },
  marketplace_poster: {
    id: "marketplace_poster",
    labelKey: "instant.premiumPreset.marketplacePoster.title",
    descriptionKey: "instant.premiumPreset.marketplacePoster.desc",
    stylePreset: "clean_business",
    motionEnergy: "cinematic",
    transitionType: "capcut_smooth",
    assemblyMode: "raw_motion_concat",
    cameraPreset: "parallax",
    fxPreset: "dust",
    comicPreset: "marketplace_promo",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
  },
  app_showcase: {
    id: "app_showcase",
    labelKey: "instant.premiumPreset.appShowcase.title",
    descriptionKey: "instant.premiumPreset.appShowcase.desc",
    stylePreset: "clean_business",
    motionEnergy: "cinematic",
    transitionType: "capcut_smooth",
    assemblyMode: "raw_motion_concat",
    cameraPreset: "dramatic_reveal",
    fxPreset: "glow",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: false,
    characterMotion: {
      emotion: "focused",
      personality: "app UI presenter",
      motionStyle: "clean product showcase",
    },
  },
  luxury_glow: {
    id: "luxury_glow",
    labelKey: "instant.premiumPreset.luxuryGlow.title",
    descriptionKey: "instant.premiumPreset.luxuryGlow.desc",
    stylePreset: "food_promo",
    motionEnergy: "cinematic",
    transitionType: "cinematic_blend",
    assemblyMode: "raw_motion_concat",
    cameraPreset: "calm_drift",
    fxPreset: "luxury_glow",
    segmentationProvider: "heuristic",
    textPreservation: true,
    minimalCompositorPolish: true,
  },
};

export const PREMIUM_POLISH_PRESET_IDS = Object.keys(
  PREMIUM_POLISH_PRESETS
) as PremiumPolishPresetId[];

export function isPremiumPolishPresetId(value: string): value is PremiumPolishPresetId {
  return (PREMIUM_POLISH_PRESET_IDS as readonly string[]).includes(value);
}

export function normalizePremiumPolishPresetId(value: unknown): PremiumPolishPresetId {
  if (typeof value === "string" && isPremiumPolishPresetId(value.trim())) {
    return value.trim() as PremiumPolishPresetId;
  }
  return DEFAULT_PREMIUM_POLISH_PRESET_ID;
}

export function getPremiumPolishPreset(id: PremiumPolishPresetId): PremiumPolishPresetConfig {
  return PREMIUM_POLISH_PRESETS[id] ?? PREMIUM_POLISH_PRESETS[DEFAULT_PREMIUM_POLISH_PRESET_ID];
}
