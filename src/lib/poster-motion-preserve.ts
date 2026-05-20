import type { BakedTextMaskRegion } from "@/lib/baked-text-protection";
import {
  DEFAULT_MOTION_ENERGY,
  normalizeMotionEnergy,
  parseCharacterMotionProfile,
  type CharacterMotionProfile,
  type MotionEnergy,
} from "@/lib/premium-motion-engine";
import {
  DEFAULT_PREMIUM_POLISH_PRESET_ID,
  normalizePremiumPolishPresetId,
  type PremiumPolishPresetId,
} from "@/lib/premium-polish-presets";
import type { CameraPresetId } from "@/lib/premium-camera-presets";
import type { FxPresetId } from "@/lib/premium-fx-presets";
import type { ComicStoryPresetId } from "@/lib/premium-comic-presets";
import {
  parseManualForegroundRegions,
  type ManualForegroundRegion,
  type SegmentationProvider,
} from "@/lib/premium-foreground-segmentation";
import {
  normalizeEmotionalActingPresetId,
  type EmotionalActingPresetId,
} from "@/lib/premium-emotional-presets";
import { getPremiumPolishPreset } from "@/lib/premium-polish-presets";

/** Layer roles for DeeVid-style poster animation (static base + moving foreground). */
export type PosterMotionLayerRole =
  | "background_static"
  | "foreground_character"
  | "foreground_prop"
  | "foreground_hand"
  | "foreground_mascot"
  | "floating_ui"
  | "particle_fx"
  | "headline_object"
  | "generated_fx";

/** How a region participates in the composite. */
export type PosterMotionRegionKind = "animated" | "static_preserved" | "generated_fx";

export type PosterMotionLayer = {
  id: string;
  role: PosterMotionLayerRole;
  regionKind: PosterMotionRegionKind;
  bbox: BakedTextMaskRegion;
  /** Normalized mask PNG URL (alpha) when segmentation succeeded. */
  maskUrl?: string;
  /** Cropped RGBA plate for Vidu motion pass. */
  cropUrl?: string;
  confidence: number;
  zIndex: number;
};

export type PosterMotionLayersSnapshot = {
  version: 1;
  sourceWidth: number;
  sourceHeight: number;
  provider: "heuristic" | "rembg_api";
  layers: PosterMotionLayer[];
};

/** Per-project user toggles for poster animation. */
export type PosterMotionSettings = {
  version: 1;
  animateMascot: boolean;
  animateProduct: boolean;
  animateForegroundOnly: boolean;
  preserveAllText: boolean;
  cinematicCameraMotion: boolean;
  particlesGlow: boolean;
  floatingGeneratedObject: boolean;
  /** 0.05–0.30 — how much Vidu motion is mixed in (highlights only). */
  posterMotionBlendStrength?: number;
  /** When true, final merge uses poster_composite_segments instead of raw_motion_concat. */
  advancedSegmentComposite?: boolean;
  /** Alias for advancedSegmentComposite (manual advanced preservation). */
  useSegmentCompositor?: boolean;
  /** capcut_smooth | cinematic_blend | soft_crossfade | motion_blend | straight_cut */
  segmentTransitionType?: string;
  /** calm | cinematic | expressive | energetic | viral */
  motionEnergy?: MotionEnergy;
  /** Mascot/character acting direction for Vidu prompts. */
  characterMotion?: CharacterMotionProfile;
  /** Alias for characterMotion */
  characterMotionDirection?: CharacterMotionProfile;
  premiumPresetId?: PremiumPolishPresetId;
  cameraPreset?: CameraPresetId;
  fxPreset?: FxPresetId;
  comicPreset?: ComicStoryPresetId;
  segmentationProvider?: SegmentationProvider;
  textPreservation?: boolean;
  minimalCompositorPolish?: boolean;
  manualForegroundRegions?: ManualForegroundRegion[];
  /** excited_seller | playful_mascot | confident_presenter | … */
  emotionalActingPreset?: EmotionalActingPresetId;
};

export const POSTER_MOTION_BLEND_MAX = 0.3;
export const POSTER_MOTION_BLEND_CINEMATIC_DEFAULT = 0.18;
export const POSTER_MOTION_BLEND_TEXT_HEAVY_DEFAULT = 0.1;

const DEFAULT_POLISH_PRESET = getPremiumPolishPreset(DEFAULT_PREMIUM_POLISH_PRESET_ID);

export const DEFAULT_POSTER_MOTION_SETTINGS: PosterMotionSettings = {
  version: 1,
  animateMascot: true,
  animateProduct: true,
  animateForegroundOnly: true,
  preserveAllText: true,
  cinematicCameraMotion: true,
  particlesGlow: true,
  floatingGeneratedObject: false,
  premiumPresetId: DEFAULT_PREMIUM_POLISH_PRESET_ID,
  motionEnergy: DEFAULT_POLISH_PRESET.motionEnergy,
  segmentTransitionType: DEFAULT_POLISH_PRESET.transitionType,
  cameraPreset: DEFAULT_POLISH_PRESET.cameraPreset,
  fxPreset: DEFAULT_POLISH_PRESET.fxPreset,
  comicPreset: DEFAULT_POLISH_PRESET.comicPreset,
  segmentationProvider: DEFAULT_POLISH_PRESET.segmentationProvider,
  textPreservation: DEFAULT_POLISH_PRESET.textPreservation,
  minimalCompositorPolish: DEFAULT_POLISH_PRESET.minimalCompositorPolish,
  characterMotion: DEFAULT_POLISH_PRESET.characterMotion,
};

export function resolvePosterMotionBlendStrength(settings: PosterMotionSettings): number {
  if (
    typeof settings.posterMotionBlendStrength === "number" &&
    Number.isFinite(settings.posterMotionBlendStrength)
  ) {
    return Math.min(
      POSTER_MOTION_BLEND_MAX,
      Math.max(0.05, settings.posterMotionBlendStrength)
    );
  }
  if (settings.preserveAllText) {
    return POSTER_MOTION_BLEND_TEXT_HEAVY_DEFAULT;
  }
  return POSTER_MOTION_BLEND_CINEMATIC_DEFAULT;
}

export const POSTER_MOTION_PRESERVE_PROMPT_BLOCK = `POSTER MOTION PRESERVE (DeeVid-style):
- The uploaded image is a finished poster/design. Preserve the full layout, typography, logos, UI, and background pixels exactly.
- Do NOT regenerate, redraw, translate, or hallucinate any text, letters, symbols, or interface copy.
- Do NOT replace the entire frame. Animate ONLY isolated foreground subjects (characters, mascots, hands, products, props).
- Keep all typography and layout baked into the static base; never invent readable characters.
- Motion should feel cinematic: subtle subject movement, lighting shifts, particles, glow, and environmental FX only on foreground layers.
- Background poster composition stays pixel-stable; no scene morphing or full-frame regeneration.`;

export function parsePosterMotionSettings(raw: unknown): PosterMotionSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_POSTER_MOTION_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) {
    return { ...DEFAULT_POSTER_MOTION_SETTINGS };
  }
  return {
    version: 1,
    animateMascot: o.animateMascot !== false,
    animateProduct: o.animateProduct !== false,
    animateForegroundOnly: o.animateForegroundOnly !== false,
    preserveAllText: o.preserveAllText !== false,
    cinematicCameraMotion: o.cinematicCameraMotion !== false,
    particlesGlow: o.particlesGlow !== false,
    floatingGeneratedObject: o.floatingGeneratedObject === true,
    posterMotionBlendStrength:
      typeof o.posterMotionBlendStrength === "number" &&
      Number.isFinite(o.posterMotionBlendStrength)
        ? Math.min(POSTER_MOTION_BLEND_MAX, Math.max(0.05, o.posterMotionBlendStrength))
        : undefined,
    advancedSegmentComposite: o.advancedSegmentComposite === true,
    useSegmentCompositor: o.useSegmentCompositor === true,
    segmentTransitionType:
      typeof o.segmentTransitionType === "string" ? o.segmentTransitionType.trim() : undefined,
    motionEnergy: normalizeMotionEnergy(o.motionEnergy),
    characterMotion:
      parseCharacterMotionProfile(o.characterMotion) ??
      parseCharacterMotionProfile(o.characterMotionDirection),
    premiumPresetId:
      typeof o.premiumPresetId === "string"
        ? normalizePremiumPolishPresetId(o.premiumPresetId)
        : DEFAULT_PREMIUM_POLISH_PRESET_ID,
    cameraPreset:
      typeof o.cameraPreset === "string" ? (o.cameraPreset as CameraPresetId) : undefined,
    fxPreset: typeof o.fxPreset === "string" ? (o.fxPreset as FxPresetId) : undefined,
    comicPreset:
      typeof o.comicPreset === "string" ? (o.comicPreset as ComicStoryPresetId) : undefined,
    segmentationProvider:
      typeof o.segmentationProvider === "string"
        ? (o.segmentationProvider as SegmentationProvider)
        : undefined,
    textPreservation:
      typeof o.textPreservation === "boolean" ? o.textPreservation : undefined,
    minimalCompositorPolish:
      typeof o.minimalCompositorPolish === "boolean" ? o.minimalCompositorPolish : undefined,
    manualForegroundRegions: parseManualForegroundRegions(o.manualForegroundRegions),
    emotionalActingPreset: normalizeEmotionalActingPresetId(o.emotionalActingPreset),
  };
}

export function resolvePosterMotionMotionEnergy(settings: PosterMotionSettings): MotionEnergy {
  return settings.motionEnergy ?? DEFAULT_MOTION_ENERGY;
}

export function parsePosterMotionLayersSnapshot(raw: unknown): PosterMotionLayersSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.layers)) {
    return null;
  }
  return {
    version: 1,
    sourceWidth: typeof o.sourceWidth === "number" ? o.sourceWidth : 720,
    sourceHeight: typeof o.sourceHeight === "number" ? o.sourceHeight : 1280,
    provider: o.provider === "rembg_api" ? "rembg_api" : "heuristic",
    layers: o.layers as PosterMotionLayer[],
  };
}

export function posterMotionSettingsFromClient(raw: unknown): PosterMotionSettings {
  return parsePosterMotionSettings(raw);
}
