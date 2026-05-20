/**
 * Creator-facing animation styles — one card configures full creative identity + pipeline.
 */

import {
  getAnimationStyleIdentity,
  identityCharacterMotion,
  type AnimationStyleIdentity,
} from "@/lib/animation-style-identity";
import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { CameraPresetId } from "@/lib/premium-camera-presets";
import type { FxPresetId } from "@/lib/premium-fx-presets";
import type { ComicStoryPresetId } from "@/lib/premium-comic-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { PremiumPolishPresetId } from "@/lib/premium-polish-presets";
import type { SegmentationProvider } from "@/lib/premium-foreground-segmentation";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import type { FinalAssemblyMode } from "@/lib/final-assembly-types";
import type { SegmentTransitionType } from "@/lib/segment-transition-types";
import type { InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import {
  ANIMATION_STYLE_IDS,
  DEFAULT_ANIMATION_STYLE_ID,
  isAnimationStyleId,
  type AnimationStyleId,
} from "@/lib/animation-style-types";

export type { AnimationStyleId } from "@/lib/animation-style-types";
export type { AnimationStyleIdentity, PresetVisualIdentity } from "@/lib/animation-style-identity";
export {
  getAnimationStyleIdentity,
  buildAnimationStyleIdentityPromptBlock,
  shouldUseSharedGroupDirecting,
} from "@/lib/animation-style-identity";
export {
  ANIMATION_STYLE_IDS,
  DEFAULT_ANIMATION_STYLE_ID,
  isAnimationStyleId,
  normalizeAnimationStyleId,
} from "@/lib/animation-style-types";

/** auto_detect = resolved at runtime via scene intelligence */
export type EmotionalPresetSetting = EmotionalActingPresetId | "auto_detect";

const STYLE_PRESET_MAP: Record<AnimationStyleId, InstantPremiumStylePreset> = {
  cartoon_animation: "food_promo",
  product_showcase: "clean_business",
  character_animation: "social_boost",
  marketplace_story: "clean_business",
  clean_motion: "clean_business",
  fast_social_animation: "social_boost",
};

const LEGACY_PREMIUM_MAP: Record<AnimationStyleId, PremiumPolishPresetId> = {
  cartoon_animation: "homecheff_mascot_promo",
  product_showcase: "luxury_glow",
  character_animation: "comic_story",
  marketplace_story: "marketplace_poster",
  clean_motion: "app_showcase",
  fast_social_animation: "affiliate_product_ad",
};

export type AnimationStyleConfig = {
  id: AnimationStyleId;
  labelKey: string;
  descriptionKey: string;
  bestForKey: string;
  identity: AnimationStyleIdentity;
  /** Flat accessors — same values as `identity` (creator + resolve layer). */
  motionEnergy: MotionEnergy;
  emotionalActingPreset: EmotionalActingPresetId | "auto_detect";
  cameraPreset: CameraPresetId;
  fxPreset: FxPresetId;
  comicPreset?: ComicStoryPresetId;
  segmentTransitionType: SegmentTransitionType;
  assemblyMode: FinalAssemblyMode;
  segmentationProvider: SegmentationProvider;
  textPreservation: boolean;
  minimalCompositorPolish: boolean;
  stylePreset: InstantPremiumStylePreset;
  legacyPremiumPresetId: PremiumPolishPresetId;
};

function configFromIdentity(identity: AnimationStyleIdentity): AnimationStyleConfig {
  const labelKeys: Record<AnimationStyleId, { title: string; desc: string; best: string }> = {
    cartoon_animation: {
      title: "instant.animationStyle.cartoon.title",
      desc: "instant.animationStyle.cartoon.desc",
      best: "instant.animationStyle.cartoon.bestFor",
    },
    product_showcase: {
      title: "instant.animationStyle.product.title",
      desc: "instant.animationStyle.product.desc",
      best: "instant.animationStyle.product.bestFor",
    },
    character_animation: {
      title: "instant.animationStyle.character.title",
      desc: "instant.animationStyle.character.desc",
      best: "instant.animationStyle.character.bestFor",
    },
    marketplace_story: {
      title: "instant.animationStyle.marketplace.title",
      desc: "instant.animationStyle.marketplace.desc",
      best: "instant.animationStyle.marketplace.bestFor",
    },
    clean_motion: {
      title: "instant.animationStyle.clean.title",
      desc: "instant.animationStyle.clean.desc",
      best: "instant.animationStyle.clean.bestFor",
    },
    fast_social_animation: {
      title: "instant.animationStyle.fastSocial.title",
      desc: "instant.animationStyle.fastSocial.desc",
      best: "instant.animationStyle.fastSocial.bestFor",
    },
  };
  const keys = labelKeys[identity.id];
  const { render } = identity;
  return {
    id: identity.id,
    labelKey: keys.title,
    descriptionKey: keys.desc,
    bestForKey: keys.best,
    identity,
    motionEnergy: identity.motionEnergy,
    emotionalActingPreset: identity.emotionalActingPreset,
    cameraPreset: identity.cameraPreset,
    fxPreset: identity.fxPreset,
    comicPreset: identity.comicPreset,
    segmentTransitionType: render.segmentTransitionType,
    assemblyMode: render.assemblyMode,
    segmentationProvider: render.segmentationProvider,
    textPreservation: render.textPreservation,
    minimalCompositorPolish: render.minimalCompositorPolish,
    stylePreset: STYLE_PRESET_MAP[identity.id],
    legacyPremiumPresetId: LEGACY_PREMIUM_MAP[identity.id],
  };
}

export const ANIMATION_STYLE_PRESETS: Record<AnimationStyleId, AnimationStyleConfig> =
  Object.fromEntries(
    ANIMATION_STYLE_IDS.map((id) => [id, configFromIdentity(getAnimationStyleIdentity(id))])
  ) as Record<AnimationStyleId, AnimationStyleConfig>;

const LEGACY_PREMIUM_TO_STYLE: Partial<Record<PremiumPolishPresetId, AnimationStyleId>> = {
  homecheff_mascot_promo: "cartoon_animation",
  affiliate_product_ad: "fast_social_animation",
  comic_story: "character_animation",
  marketplace_poster: "marketplace_story",
  app_showcase: "clean_motion",
  luxury_glow: "product_showcase",
};

export function animationStyleFromLegacyPremiumPreset(
  premiumPresetId: PremiumPolishPresetId
): AnimationStyleId {
  return LEGACY_PREMIUM_TO_STYLE[premiumPresetId] ?? DEFAULT_ANIMATION_STYLE_ID;
}

export function getAnimationStyle(id: AnimationStyleId): AnimationStyleConfig {
  return ANIMATION_STYLE_PRESETS[id] ?? ANIMATION_STYLE_PRESETS[DEFAULT_ANIMATION_STYLE_ID];
}

/** Apply full hidden pipeline + identity stack from a creator-facing style card. */
export function applyAnimationStyleToPosterSettings(
  styleId: AnimationStyleId,
  existing?: Partial<PosterMotionSettings>
): PosterMotionSettings {
  const style = getAnimationStyle(styleId);
  const { identity } = style;
  const { render } = identity;
  const charMotion = identityCharacterMotion(styleId);
  return {
    version: 1,
    floatingGeneratedObject: false,
    ...existing,
    animationStyleId: styleId,
    premiumPresetId: style.legacyPremiumPresetId,
    motionEnergy: identity.motionEnergy,
    segmentTransitionType: render.segmentTransitionType,
    cameraPreset: identity.cameraPreset,
    fxPreset: identity.fxPreset,
    comicPreset: identity.comicPreset,
    segmentationProvider: render.segmentationProvider,
    textPreservation: render.textPreservation,
    minimalCompositorPolish: render.minimalCompositorPolish,
    animateMascot: render.animateMascot,
    animateProduct: render.animateProduct,
    animateForegroundOnly: render.animateForegroundOnly,
    preserveAllText: render.preserveAllText,
    cinematicCameraMotion: render.cinematicCameraMotion,
    particlesGlow: render.particlesGlow,
    posterMotionBlendStrength: render.posterMotionBlendStrength,
    emotionalActingPreset:
      identity.emotionalActingPreset === "auto_detect"
        ? undefined
        : identity.emotionalActingPreset,
    characterMotion: charMotion,
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
