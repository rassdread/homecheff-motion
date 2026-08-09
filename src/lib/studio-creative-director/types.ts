/**
 * S.6F — Creative Director shared types.
 * Orchestrator only: never owns Continuity, Matrix, Transforms, credits, or providers.
 */

export const STUDIO_CREATIVE_DIRECTOR_VERSION = "6f.1" as const;

export type StudioProductMode = "QUICK" | "PROFESSIONAL" | "DIRECTOR";

export type StudioProductExperienceFamily =
  | "PEOPLE"
  | "BUSINESS"
  | "SOCIAL"
  | "CREATIVE"
  | "IDENTITY";

export type StudioProductExperienceStatus =
  | "LIVE"
  | "PARTIAL"
  | "ADVANCED"
  | "LEGACY"
  | "EXPERIMENTAL"
  | "MISSING";

export type StudioContinuityRequirementLevel =
  | "none"
  | "optional"
  | "when_linked"
  | "source_image"
  | "fusion_refs"
  | "required_entities";

/** Existing planner modules the Director may recommend (never rewrite). */
export type StudioDelegatedPlannerId =
  | "auto_shot"
  | "shot_planner"
  | "ai_director_interpreter"
  | "director_proposal"
  | "music_director"
  | "sound_director"
  | "voice_director"
  | "audio_production_director"
  | "composition_director"
  | "blocking_director"
  | "animation_planner"
  | "vidu_execution_planner"
  | "production_center"
  | "movie_builder"
  | "creation_assistant"
  | "fusion_intelligence"
  | "scene_still_matrix";

export type StudioCreativeDirectorOwnership = {
  owns: readonly string[];
  neverOwns: readonly string[];
};

export const STUDIO_CREATIVE_DIRECTOR_OWNERSHIP: StudioCreativeDirectorOwnership = {
  owns: [
    "experience_selection",
    "creative_intent",
    "planning_recommendations",
    "workflow_guidance",
    "quality_guidance",
    "mode_selection",
    "creative_specification_selections",
  ],
  neverOwns: [
    "character_identity",
    "location_identity",
    "prop_identity",
    "world_identity",
    "continuity_bundle",
    "prompt_assembly",
    "provider_prompts",
    "provider_transforms",
    "billing",
    "credits",
    "generation_jobs",
    "fusion_pixel_preservation",
  ],
};
