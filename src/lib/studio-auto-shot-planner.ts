/**
 * Studio V25 — director-aware auto shot / movement / energy recommendations.
 */

import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  type StoryArcPhase,
  buildStoryArc,
  type StoryArcEntry,
} from "@/lib/studio-story-arc";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import {
  legacyCameraFromShotType,
  type StudioCameraMovement,
  type StudioSceneEnergy,
  type StudioShotType,
} from "@/lib/studio-scene-director";

export type ShotPlanRecommendation = {
  sceneId: string;
  order: number;
  title: string;
  arcPhase: StoryArcPhase;
  shotType: StudioShotType;
  cameraMovement: StudioCameraMovement;
  sceneEnergy: StudioSceneEnergy;
  legacyCamera: string;
  rationaleKey: string;
};

type PhasePlan = {
  shotType: StudioShotType;
  cameraMovement: StudioCameraMovement;
  sceneEnergy: StudioSceneEnergy;
  rationaleKey: string;
};

const BASE_PHASE_PLANS: Record<StoryArcPhase, PhasePlan> = {
  opening: {
    shotType: "wide",
    cameraMovement: "push_in",
    sceneEnergy: "calm",
    rationaleKey: "studio.intelligence.plan.rationale.opening",
  },
  discovery: {
    shotType: "medium_wide",
    cameraMovement: "tracking",
    sceneEnergy: "neutral",
    rationaleKey: "studio.intelligence.plan.rationale.discovery",
  },
  build_up: {
    shotType: "medium",
    cameraMovement: "follow",
    sceneEnergy: "neutral",
    rationaleKey: "studio.intelligence.plan.rationale.buildUp",
  },
  transition: {
    shotType: "medium",
    cameraMovement: "pan_right",
    sceneEnergy: "dynamic",
    rationaleKey: "studio.intelligence.plan.rationale.transition",
  },
  climax: {
    shotType: "medium_close_up",
    cameraMovement: "crane",
    sceneEnergy: "intense",
    rationaleKey: "studio.intelligence.plan.rationale.climax",
  },
  resolution: {
    shotType: "wide",
    cameraMovement: "pull_out",
    sceneEnergy: "calm",
    rationaleKey: "studio.intelligence.plan.rationale.resolution",
  },
  outro: {
    shotType: "wide",
    cameraMovement: "static",
    sceneEnergy: "calm",
    rationaleKey: "studio.intelligence.plan.rationale.outro",
  },
};

function applyDirectorAdaptation(
  plan: PhasePlan,
  phase: StoryArcPhase,
  profile: StudioDirectorProfile
): PhasePlan {
  switch (profile) {
    case "documentary":
      return {
        ...plan,
        cameraMovement: phase === "discovery" ? "follow" : phase === "climax" ? "static" : plan.cameraMovement,
        sceneEnergy: phase === "climax" ? "dynamic" : "neutral",
        rationaleKey: "studio.intelligence.plan.rationale.documentary",
      };
    case "cinematic":
      return {
        ...plan,
        shotType:
          phase === "climax" ? "close_up"
          : phase === "opening" ? "extreme_wide"
          : plan.shotType,
        cameraMovement: phase === "climax" ? "crane" : phase === "resolution" ? "pull_out" : plan.cameraMovement,
        sceneEnergy:
          phase === "opening" || phase === "resolution" ? "calm"
          : phase === "climax" ? "intense"
          : "dynamic",
        rationaleKey: "studio.intelligence.plan.rationale.cinematic",
      };
    case "social_media":
      return {
        ...plan,
        shotType: phase === "climax" ? "close_up" : phase === "opening" ? "medium_close_up" : plan.shotType,
        cameraMovement: phase === "opening" ? "push_in" : phase === "transition" ? "tracking" : plan.cameraMovement,
        sceneEnergy: phase === "opening" ? "dynamic" : phase === "climax" ? "intense" : "dynamic",
        rationaleKey: "studio.intelligence.plan.rationale.social",
      };
    case "storytelling":
      return {
        ...plan,
        cameraMovement:
          phase === "discovery" ? "tracking"
          : phase === "transition" ? "orbit"
          : plan.cameraMovement,
        sceneEnergy: phase === "build_up" ? "dynamic" : plan.sceneEnergy,
        rationaleKey: "studio.intelligence.plan.rationale.adventure",
      };
    case "educational":
      return {
        ...plan,
        shotType: phase === "climax" ? "medium" : phase === "discovery" ? "medium_wide" : plan.shotType,
        cameraMovement: "static",
        sceneEnergy: "neutral",
        rationaleKey: "studio.intelligence.plan.rationale.educational",
      };
    case "commercial":
    default:
      return {
        ...plan,
        shotType: phase === "climax" ? "medium_close_up" : plan.shotType,
        rationaleKey: "studio.intelligence.plan.rationale.commercial",
      };
  }
}

export function planForArcPhase(
  phase: StoryArcPhase,
  directorProfile: StudioDirectorProfile
): PhasePlan {
  const base = BASE_PHASE_PLANS[phase];
  return applyDirectorAdaptation(base, phase, directorProfile);
}

export function buildAutoShotPlan(
  scenes: StoryFlowSceneInput[],
  directorProfile: StudioDirectorProfile
): ShotPlanRecommendation[] {
  const arc: StoryArcEntry[] = buildStoryArc(scenes);
  return arc.map((entry) => {
    const plan = planForArcPhase(entry.phase, directorProfile);
    return {
      sceneId: entry.sceneId,
      order: entry.order,
      title: entry.title,
      arcPhase: entry.phase,
      shotType: plan.shotType,
      cameraMovement: plan.cameraMovement,
      sceneEnergy: plan.sceneEnergy,
      legacyCamera: legacyCameraFromShotType(plan.shotType) ?? "",
      rationaleKey: plan.rationaleKey,
    };
  });
}
