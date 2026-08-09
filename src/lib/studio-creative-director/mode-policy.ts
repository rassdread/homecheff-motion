/**
 * S.6F — Product mode policy (Quick / Professional / Director).
 * Architecture only: no UI redesign. Modes gate vocabulary + planner depth.
 */

import type { StudioProductMode } from "@/lib/studio-creative-director/types";
import type { StudioDelegatedPlannerId } from "@/lib/studio-creative-director/types";

export type StudioModePolicy = {
  mode: StudioProductMode;
  /** Consumer-facing: avoid professional jargon. */
  allowProfessionalTerminology: boolean;
  allowBrandControls: boolean;
  allowAudiencePlatformControls: boolean;
  allowCameraVoiceMusicControls: boolean;
  allowEntityLinking: boolean;
  allowSceneShotPlanning: boolean;
  allowFusionMotionMovieProduction: boolean;
  allowProviderStrategyHints: boolean;
  defaultPlanners: StudioDelegatedPlannerId[];
  maxQuickQuestions: number;
};

const QUICK_POLICY: StudioModePolicy = {
  mode: "QUICK",
  allowProfessionalTerminology: false,
  allowBrandControls: false,
  allowAudiencePlatformControls: false,
  allowCameraVoiceMusicControls: false,
  allowEntityLinking: false,
  allowSceneShotPlanning: false,
  allowFusionMotionMovieProduction: false,
  allowProviderStrategyHints: false,
  defaultPlanners: ["fusion_intelligence", "animation_planner", "scene_still_matrix"],
  maxQuickQuestions: 4,
};

const PROFESSIONAL_POLICY: StudioModePolicy = {
  mode: "PROFESSIONAL",
  allowProfessionalTerminology: false,
  allowBrandControls: true,
  allowAudiencePlatformControls: true,
  allowCameraVoiceMusicControls: true,
  allowEntityLinking: true,
  allowSceneShotPlanning: false,
  allowFusionMotionMovieProduction: false,
  allowProviderStrategyHints: false,
  defaultPlanners: [
    "ai_director_interpreter",
    "fusion_intelligence",
    "music_director",
    "voice_director",
    "animation_planner",
  ],
  maxQuickQuestions: 8,
};

const DIRECTOR_POLICY: StudioModePolicy = {
  mode: "DIRECTOR",
  allowProfessionalTerminology: true,
  allowBrandControls: true,
  allowAudiencePlatformControls: true,
  allowCameraVoiceMusicControls: true,
  allowEntityLinking: true,
  allowSceneShotPlanning: true,
  allowFusionMotionMovieProduction: true,
  allowProviderStrategyHints: true,
  defaultPlanners: [
    "director_proposal",
    "auto_shot",
    "shot_planner",
    "music_director",
    "voice_director",
    "sound_director",
    "composition_director",
    "blocking_director",
    "animation_planner",
    "vidu_execution_planner",
    "production_center",
    "movie_builder",
    "creation_assistant",
    "fusion_intelligence",
    "scene_still_matrix",
  ],
  maxQuickQuestions: 16,
};

export function getModePolicy(mode: StudioProductMode): StudioModePolicy {
  switch (mode) {
    case "QUICK":
      return QUICK_POLICY;
    case "PROFESSIONAL":
      return PROFESSIONAL_POLICY;
    case "DIRECTOR":
      return DIRECTOR_POLICY;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function resolveProductMode(input: {
  requested?: StudioProductMode | null;
  /** When true, prefer Director (pro creators / advanced workspace). */
  preferDirector?: boolean;
  /** Business / brand-oriented entry. */
  preferProfessional?: boolean;
}): StudioProductMode {
  if (input.requested) return input.requested;
  if (input.preferDirector) return "DIRECTOR";
  if (input.preferProfessional) return "PROFESSIONAL";
  return "QUICK";
}

export function filterPlannersForMode(
  planners: readonly StudioDelegatedPlannerId[],
  mode: StudioProductMode
): StudioDelegatedPlannerId[] {
  const policy = getModePolicy(mode);
  if (mode === "DIRECTOR") {
    return [...new Set([...planners, ...policy.defaultPlanners])];
  }
  if (mode === "PROFESSIONAL") {
    const allowed = new Set<StudioDelegatedPlannerId>([
      ...policy.defaultPlanners,
      "director_proposal",
      "scene_still_matrix",
      "auto_shot",
    ]);
    const filtered = planners.filter((p) => allowed.has(p));
    return filtered.length > 0 ? filtered : [...policy.defaultPlanners];
  }
  // QUICK: keep experience recommendations that are consumer-safe
  const quickAllowed = new Set<StudioDelegatedPlannerId>(policy.defaultPlanners);
  const filtered = planners.filter((p) => quickAllowed.has(p));
  return filtered.length > 0 ? filtered : [...policy.defaultPlanners];
}
