/**
 * Full creative identity per Animation Type — visual, motion, directing, cinematic, render.
 */

import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { CameraPresetId } from "@/lib/premium-camera-presets";
import type { FxPresetId } from "@/lib/premium-fx-presets";
import type { ComicStoryPresetId } from "@/lib/premium-comic-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { SegmentationProvider } from "@/lib/premium-foreground-segmentation";
import type { FinalAssemblyMode } from "@/lib/final-assembly-types";
import type { SegmentTransitionType } from "@/lib/segment-transition-types";
import type { AnimationStyleId } from "@/lib/animation-style-types";

export type PresetAccentTone =
  | "violet"
  | "amber"
  | "gold"
  | "emerald"
  | "sky"
  | "zinc"
  | "rose";

/** Tailwind class bundles for creator UI — one preset = one visual world. */
export type PresetVisualIdentity = {
  accentTone: PresetAccentTone;
  cardIdle: string;
  cardHover: string;
  cardSelected: string;
  badge: string;
  progressBar: string;
  identityTaglineKey: string;
};

export type PresetDirectingFocus =
  | "mascot_lead"
  | "product_lead"
  | "shared_group"
  | "character_expressive"
  | "minimal_static"
  | "social_punch";

export type PresetDirectingIdentity = {
  focusStrategy: PresetDirectingFocus;
  multiCharacterSharedFocus: boolean;
  typographyPriority: "maximum" | "high" | "balanced" | "low";
  promptBlock: string;
  characterMotion: {
    emotion: string;
    personality: string;
    motionStyle: string;
    energy?: string;
  };
};

export type PresetCinematicIdentity = {
  pacingLabel: string;
  toneLabel: string;
  continuityDefault: "balanced" | "strict";
  promptBlock: string;
};

export type PresetRenderIdentity = {
  assemblyMode: FinalAssemblyMode;
  segmentTransitionType: SegmentTransitionType;
  segmentationProvider: SegmentationProvider;
  segmentationStrategy: string;
  minimalCompositorPolish: boolean;
  posterMotionBlendStrength: number;
  textPreservation: boolean;
  animateMascot: boolean;
  animateProduct: boolean;
  animateForegroundOnly: boolean;
  preserveAllText: boolean;
  cinematicCameraMotion: boolean;
  particlesGlow: boolean;
};

export type AnimationStyleIdentity = {
  id: AnimationStyleId;
  visual: PresetVisualIdentity;
  motionEnergy: MotionEnergy;
  emotionalActingPreset: EmotionalActingPresetId | "auto_detect";
  cameraPreset: CameraPresetId;
  fxPreset: FxPresetId;
  comicPreset?: ComicStoryPresetId;
  directing: PresetDirectingIdentity;
  cinematic: PresetCinematicIdentity;
  render: PresetRenderIdentity;
};

export const ANIMATION_STYLE_IDENTITIES: Record<AnimationStyleId, AnimationStyleIdentity> = {
  cartoon_animation: {
    id: "cartoon_animation",
    visual: {
      accentTone: "violet",
      cardIdle: "border-zinc-200/90 bg-white",
      cardHover: "border-violet-200 bg-white hover:shadow-md",
      cardSelected: "border-transparent bg-violet-50/95 ring-2 ring-violet-400 shadow-md",
      badge: "bg-violet-600 text-white",
      progressBar: "bg-violet-600",
      identityTaglineKey: "instant.identity.cartoon.tagline",
    },
    motionEnergy: "expressive",
    emotionalActingPreset: "auto_detect",
    cameraPreset: "calm_drift",
    fxPreset: "social_energy",
    comicPreset: "mascot_seller",
    directing: {
      focusStrategy: "mascot_lead",
      multiCharacterSharedFocus: true,
      typographyPriority: "maximum",
      promptBlock: `CREATIVE IDENTITY — CARTOON ANIMATION:
- Comic poster energy: expressive mascots, playful presentation, readable typography frozen.
- Mascot-forward acting with social glow; speech bubbles and logos never morph.
- Comic pacing between keyframes; shared focus when multiple mascots appear.`,
      characterMotion: {
        emotion: "warm and enthusiastic",
        personality: "friendly chef/comic mascot presenter",
        motionStyle: "cinematic social comic host with varied gestures",
        energy: "presentation-forward",
      },
    },
    cinematic: {
      pacingLabel: "comic social",
      toneLabel: "playful premium",
      continuityDefault: "balanced",
      promptBlock: `CINEMATIC TONE — CARTOON:
- Playful premium Reels pacing; lively but not chaotic.
- Emotional continuity across segments; mascot performance evolves naturally.`,
    },
    render: {
      assemblyMode: "raw_motion_concat",
      segmentTransitionType: "capcut_smooth",
      segmentationProvider: "heuristic",
      segmentationStrategy: "mascot + text bands; typography locked static",
      minimalCompositorPolish: false,
      posterMotionBlendStrength: 0.12,
      textPreservation: true,
      animateMascot: true,
      animateProduct: true,
      animateForegroundOnly: true,
      preserveAllText: true,
      cinematicCameraMotion: true,
      particlesGlow: true,
    },
  },
  product_showcase: {
    id: "product_showcase",
    visual: {
      accentTone: "gold",
      cardIdle: "border-zinc-200/90 bg-white",
      cardHover: "border-amber-200 bg-white hover:shadow-md",
      cardSelected: "border-transparent bg-amber-50/95 ring-2 ring-amber-400 shadow-md",
      badge: "bg-amber-700 text-white",
      progressBar: "bg-amber-600",
      identityTaglineKey: "instant.identity.product.tagline",
    },
    motionEnergy: "cinematic",
    emotionalActingPreset: "confident_presenter",
    cameraPreset: "dramatic_reveal",
    fxPreset: "luxury_glow",
    directing: {
      focusStrategy: "product_lead",
      multiCharacterSharedFocus: false,
      typographyPriority: "high",
      promptBlock: `CREATIVE IDENTITY — PRODUCT SHOWCASE:
- Luxury affiliate ad: hero product and presenter support; elegant restrained motion.
- Stable typography and price tags; subtle luxury glow on product only.
- Cinematic reveal pacing; premium marketplace ad tone.`,
      characterMotion: {
        emotion: "confident and aspirational",
        personality: "luxury product presenter",
        motionStyle: "premium short-form product showcase",
        energy: "elegant restraint",
      },
    },
    cinematic: {
      pacingLabel: "luxury showcase",
      toneLabel: "premium elegant",
      continuityDefault: "balanced",
      promptBlock: `CINEMATIC TONE — PRODUCT SHOWCASE:
- Slow premium reveal energy; measured camera; product remains hero.`,
    },
    render: {
      assemblyMode: "raw_motion_concat",
      segmentTransitionType: "capcut_smooth",
      segmentationProvider: "heuristic",
      segmentationStrategy: "product hero bbox; text/logo static",
      minimalCompositorPolish: true,
      posterMotionBlendStrength: 0.1,
      textPreservation: true,
      animateMascot: false,
      animateProduct: true,
      animateForegroundOnly: true,
      preserveAllText: true,
      cinematicCameraMotion: true,
      particlesGlow: true,
    },
  },
  character_animation: {
    id: "character_animation",
    visual: {
      accentTone: "emerald",
      cardIdle: "border-zinc-200/90 bg-white",
      cardHover: "border-emerald-200 bg-white hover:shadow-md",
      cardSelected: "border-transparent bg-emerald-50/95 ring-2 ring-emerald-400 shadow-md",
      badge: "bg-emerald-600 text-white",
      progressBar: "bg-emerald-600",
      identityTaglineKey: "instant.identity.character.tagline",
    },
    motionEnergy: "expressive",
    emotionalActingPreset: "playful_mascot",
    cameraPreset: "calm_drift",
    fxPreset: "glow",
    directing: {
      focusStrategy: "character_expressive",
      multiCharacterSharedFocus: false,
      typographyPriority: "balanced",
      promptBlock: `CREATIVE IDENTITY — CHARACTER ANIMATION:
- Expressive faces, body language, gesture variation; secondary motion on mascots/people.
- Less typography focus — character performance is the story.
- Emotional acting beats; avoid repetitive gesture loops.`,
      characterMotion: {
        emotion: "playful and expressive",
        personality: "animated character or mascot",
        motionStyle: "performance-driven character acting",
        energy: "expressive",
      },
    },
    cinematic: {
      pacingLabel: "character-driven",
      toneLabel: "emotional expressive",
      continuityDefault: "balanced",
      promptBlock: `CINEMATIC TONE — CHARACTER:
- Performance-first pacing; micro-expression and gesture continuity.`,
    },
    render: {
      assemblyMode: "raw_motion_concat",
      segmentTransitionType: "capcut_smooth",
      segmentationProvider: "heuristic",
      segmentationStrategy: "face/hand/mascot priority",
      minimalCompositorPolish: false,
      posterMotionBlendStrength: 0.18,
      textPreservation: true,
      animateMascot: true,
      animateProduct: false,
      animateForegroundOnly: true,
      preserveAllText: true,
      cinematicCameraMotion: true,
      particlesGlow: false,
    },
  },
  marketplace_story: {
    id: "marketplace_story",
    visual: {
      accentTone: "sky",
      cardIdle: "border-zinc-200/90 bg-white",
      cardHover: "border-sky-200 bg-white hover:shadow-md",
      cardSelected: "border-transparent bg-sky-50/95 ring-2 ring-sky-500 shadow-md",
      badge: "bg-sky-600 text-white",
      progressBar: "bg-sky-600",
      identityTaglineKey: "instant.identity.marketplace.tagline",
    },
    motionEnergy: "cinematic",
    emotionalActingPreset: "energetic_creator",
    cameraPreset: "parallax",
    fxPreset: "dust",
    comicPreset: "marketplace_promo",
    directing: {
      focusStrategy: "shared_group",
      multiCharacterSharedFocus: true,
      typographyPriority: "high",
      promptBlock: `CREATIVE IDENTITY — MARKETPLACE STORY:
- Community/world storytelling: warm atmosphere, layered depth, crowd as ambient.
- Multi-character shared focus cycling; marketplace cards and typography stable.
- Environmental motion + co-lead mascots; creator-world energy.`,
      characterMotion: {
        emotion: "welcoming and community-driven",
        personality: "marketplace storyteller",
        motionStyle: "warm community cinematic host",
        energy: "engaged",
      },
    },
    cinematic: {
      pacingLabel: "community story",
      toneLabel: "warm atmospheric",
      continuityDefault: "balanced",
      promptBlock: `CINEMATIC TONE — MARKETPLACE:
- Warm parallax depth; community pacing; coherent world feeling.`,
    },
    render: {
      assemblyMode: "raw_motion_concat",
      segmentTransitionType: "capcut_smooth",
      segmentationProvider: "heuristic",
      segmentationStrategy: "multi-subject layers + text bands",
      minimalCompositorPolish: false,
      posterMotionBlendStrength: 0.14,
      textPreservation: true,
      animateMascot: true,
      animateProduct: true,
      animateForegroundOnly: true,
      preserveAllText: true,
      cinematicCameraMotion: true,
      particlesGlow: true,
    },
  },
  clean_motion: {
    id: "clean_motion",
    visual: {
      accentTone: "zinc",
      cardIdle: "border-zinc-200/90 bg-white",
      cardHover: "border-zinc-300 bg-white hover:shadow-sm",
      cardSelected: "border-transparent bg-zinc-50 ring-2 ring-zinc-400 shadow-sm",
      badge: "bg-zinc-700 text-white",
      progressBar: "bg-zinc-500",
      identityTaglineKey: "instant.identity.clean.tagline",
    },
    motionEnergy: "calm",
    emotionalActingPreset: "confident_presenter",
    cameraPreset: "none",
    fxPreset: "none",
    directing: {
      focusStrategy: "minimal_static",
      multiCharacterSharedFocus: false,
      typographyPriority: "maximum",
      promptBlock: `CREATIVE IDENTITY — CLEAN MOTION:
- Typography-safe minimal motion: subtle drift only, no aggressive acting.
- Calm pacing for posters and design-led layouts; almost static feel.
- No FX wash; preserve design integrity.`,
      characterMotion: {
        emotion: "calm and neutral",
        personality: "minimal motion presenter",
        motionStyle: "subtle ambient movement only",
        energy: "restrained",
      },
    },
    cinematic: {
      pacingLabel: "minimal calm",
      toneLabel: "neutral clean",
      continuityDefault: "strict",
      promptBlock: `CINEMATIC TONE — CLEAN MOTION:
- Ultra-subtle motion; strict continuity; design-first.`,
    },
    render: {
      assemblyMode: "raw_motion_concat",
      segmentTransitionType: "capcut_smooth",
      segmentationProvider: "heuristic",
      segmentationStrategy: "conservative subject mask; max text lock",
      minimalCompositorPolish: false,
      posterMotionBlendStrength: 0.08,
      textPreservation: true,
      animateMascot: true,
      animateProduct: true,
      animateForegroundOnly: true,
      preserveAllText: true,
      cinematicCameraMotion: false,
      particlesGlow: false,
    },
  },
  fast_social_animation: {
    id: "fast_social_animation",
    visual: {
      accentTone: "rose",
      cardIdle: "border-zinc-200/90 bg-white",
      cardHover: "border-rose-200 bg-white hover:shadow-md",
      cardSelected: "border-transparent bg-rose-50/95 ring-2 ring-rose-400 shadow-md",
      badge: "bg-rose-600 text-white",
      progressBar: "bg-rose-500",
      identityTaglineKey: "instant.identity.fastSocial.tagline",
    },
    motionEnergy: "viral",
    emotionalActingPreset: "energetic_creator",
    cameraPreset: "punch_in",
    fxPreset: "social_energy",
    directing: {
      focusStrategy: "social_punch",
      multiCharacterSharedFocus: false,
      typographyPriority: "high",
      promptBlock: `CREATIVE IDENTITY — FAST SOCIAL:
- TikTok/Reels hook energy: punchy gestures, scroll-stopping expression, fast engagement timing.
- Creator-style movement on face and hands; social-energy FX subtle on subject only.
- Stronger pacing; still physically plausible.`,
      characterMotion: {
        emotion: "energetic and engaging",
        personality: "social creator / UGC host",
        motionStyle: "viral short-form creator energy",
        energy: "high",
      },
    },
    cinematic: {
      pacingLabel: "viral social",
      toneLabel: "energetic vibrant",
      continuityDefault: "balanced",
      promptBlock: `CINEMATIC TONE — FAST SOCIAL:
- Punchy social ad pacing; dynamic but not slideshow jitter.`,
    },
    render: {
      assemblyMode: "raw_motion_concat",
      segmentTransitionType: "capcut_smooth",
      segmentationProvider: "heuristic",
      segmentationStrategy: "foreground subject priority; text locked",
      minimalCompositorPolish: false,
      posterMotionBlendStrength: 0.16,
      textPreservation: true,
      animateMascot: true,
      animateProduct: true,
      animateForegroundOnly: true,
      preserveAllText: true,
      cinematicCameraMotion: true,
      particlesGlow: true,
    },
  },
};

export function getAnimationStyleIdentity(id: AnimationStyleId): AnimationStyleIdentity {
  return (
    ANIMATION_STYLE_IDENTITIES[id] ??
    ANIMATION_STYLE_IDENTITIES.cartoon_animation
  );
}

export function buildAnimationStyleIdentityPromptBlock(id: AnimationStyleId): string {
  const identity = getAnimationStyleIdentity(id);
  return [
    identity.directing.promptBlock,
    identity.cinematic.promptBlock,
    `SEGMENTATION & RENDER PROFILE (${id}): ${identity.render.segmentationStrategy}.`,
  ].join("\n\n");
}

export function identityCharacterMotion(
  id: AnimationStyleId
): AnimationStyleIdentity["directing"]["characterMotion"] {
  return getAnimationStyleIdentity(id).directing.characterMotion;
}

export function shouldUseSharedGroupDirecting(id: AnimationStyleId): boolean {
  return getAnimationStyleIdentity(id).directing.multiCharacterSharedFocus;
}
