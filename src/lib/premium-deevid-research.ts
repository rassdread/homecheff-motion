/**
 * DeeVid-style research — inferred architectural differences vs generic AI video.
 * Documentation-only module; does not alter assembly pipeline.
 */

export type DeeVidTechniqueCategory =
  | "motion_priors"
  | "segmentation_masks"
  | "foreground_isolation"
  | "temporal_stabilization"
  | "camera_consistency"
  | "facial_animation_bias"
  | "motion_interpolation"
  | "secondary_motion"
  | "poster_compositing"
  | "emotional_acting_prompts";

export type InferredDeeVidTechnique = {
  id: string;
  category: DeeVidTechniqueCategory;
  /** What DeeVid-style output likely does differently. */
  inference: string;
  /** How HomeCheff Motion implements the equivalent without pipeline reset. */
  homecheffApproach: string;
};

/** Research summary: DeeVid animated posters vs generic slideshow AI. */
export const DEEVID_VS_HOMECHEFF_RESEARCH: InferredDeeVidTechnique[] = [
  {
    id: "static-poster-base",
    category: "poster_compositing",
    inference:
      "Original layout/typography stays pixel-stable; only isolated foreground plates receive motion.",
    homecheffApproach:
      "poster_motion_preserve + baked text masks + raw_motion_concat; no full-frame OCR redraw.",
  },
  {
    id: "foreground-matting",
    category: "segmentation_masks",
    inference: "Subject masks with feathered edges separate mascot/product from UI/text bands.",
    homecheffApproach:
      "Heuristic layers + optional rembg/SAM2 hooks + manual regions; typography roles locked static.",
  },
  {
    id: "acting-prompt-layer",
    category: "emotional_acting_prompts",
    inference:
      "Generation prompts bias emotional performance, secondary motion, and gesture variation.",
    homecheffApproach: "premium-motion-engine + emotional presets injected into Vidu segment prompts.",
  },
  {
    id: "temporal-coherence",
    category: "temporal_stabilization",
    inference:
      "Continuity markers and segment overlap transitions prevent expression snap and motion flicker.",
    homecheffApproach:
      "hc_continuity markers, capcut_smooth A→B overlap, temporal stability prompt block.",
  },
  {
    id: "cinematic-camera",
    category: "camera_consistency",
    inference: "Subtle drift/parallax with momentum — never random shake or slideshow pan.",
    homecheffApproach: "premium-camera-presets prompt hints; heavy zoompan disabled in pipeline rules.",
  },
  {
    id: "secondary-life",
    category: "secondary_motion",
    inference: "Blink, breath, cloth reactivity, anticipation/follow-through on mascots.",
    homecheffApproach: "SECONDARY MOTION block in buildPremiumMotionPromptBlocks.",
  },
  {
    id: "social-fx-subtle",
    category: "motion_priors",
    inference: "Light glow/particles on subject only; text/UI never washed out.",
    homecheffApproach: "FX prompt layer + optional minimal FFmpeg eq on final export only.",
  },
];

export const DEEVID_QUALITY_TARGETS = [
  "expressive mascot acting",
  "cinematic motion continuity",
  "typography preservation",
  "invisible segment transitions",
  "social/TikTok ad polish",
] as const;

export function getDeeVidResearchSummary(): string {
  return DEEVID_VS_HOMECHEFF_RESEARCH.map(
    (t) => `[${t.category}] ${t.inference} → ${t.homecheffApproach}`
  ).join("\n");
}
