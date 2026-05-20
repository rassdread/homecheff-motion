import type { BakedTextMaskRegion } from "@/lib/baked-text-protection";
import {
  DEFAULT_MOTION_ENERGY,
  normalizeMotionEnergy,
  parseCharacterMotionProfile,
  type CharacterMotionProfile,
  type MotionEnergy,
} from "@/lib/premium-motion-engine";

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
};

export const POSTER_MOTION_BLEND_MAX = 0.3;
export const POSTER_MOTION_BLEND_CINEMATIC_DEFAULT = 0.18;
export const POSTER_MOTION_BLEND_TEXT_HEAVY_DEFAULT = 0.1;

export const DEFAULT_POSTER_MOTION_SETTINGS: PosterMotionSettings = {
  version: 1,
  animateMascot: true,
  animateProduct: true,
  animateForegroundOnly: true,
  preserveAllText: true,
  cinematicCameraMotion: true,
  particlesGlow: true,
  floatingGeneratedObject: false,
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
