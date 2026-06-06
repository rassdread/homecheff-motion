/**
 * Per-scene AI director suggestions (advisory, apply optional).
 */

import { buildAutoShotPlan } from "@/lib/studio-auto-shot-planner";
import { detectArcPhaseForIndex } from "@/lib/studio-story-arc";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import type {
  StudioCharacterListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";

export type SceneSuggestionCode =
  | "use_close_up"
  | "use_wide"
  | "more_emotion"
  | "better_transition"
  | "focus_protagonist"
  | "stronger_finale"
  | "add_movement"
  | "raise_energy";

export type SceneSuggestion = {
  id: string;
  code: SceneSuggestionCode;
  messageKey: string;
  patch: StudioSceneUpdateInput;
};

function suggestionId(sceneId: string, code: string): string {
  return `${sceneId}:${code}`;
}

export function buildSceneSuggestions(params: {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  cast?: StudioCharacterListItem[];
}): SceneSuggestion[] {
  const { storyboard, scene, sceneIndex, sceneCount, cast = [] } = params;
  const directorProfile = normalizeStudioDirectorProfile(storyboard.directorProfile);
  const flow = storyboardToFlowInput(storyboard);
  const plan = buildAutoShotPlan(flow, directorProfile);
  const recommended = plan.find((p) => p.sceneId === scene.id);
  const suggestions: SceneSuggestion[] = [];
  const arcPhase = detectArcPhaseForIndex(sceneIndex, sceneCount);
  const isLast = sceneIndex === sceneCount - 1;
  const isClimax = arcPhase === "climax";

  if (recommended) {
    const currentShot = scene.shotType?.trim() || scene.camera?.trim() || "";
    if (
      recommended.shotType === "close_up" &&
      currentShot !== "close_up" &&
      currentShot !== "extreme_close_up"
    ) {
      suggestions.push({
        id: suggestionId(scene.id, "use_close_up"),
        code: "use_close_up",
        messageKey: "studio.aiAssistant.suggestions.useCloseUp",
        patch: {
          shotType: "close_up",
          cameraMovement: recommended.cameraMovement,
        },
      });
    }
    if (recommended.shotType === "wide" && !currentShot.includes("wide")) {
      suggestions.push({
        id: suggestionId(scene.id, "use_wide"),
        code: "use_wide",
        messageKey: "studio.aiAssistant.suggestions.useWide",
        patch: {
          shotType: "wide",
          cameraMovement: recommended.cameraMovement,
        },
      });
    }
    if (
      recommended.sceneEnergy !== scene.sceneEnergy &&
      recommended.sceneEnergy !== "neutral"
    ) {
      suggestions.push({
        id: suggestionId(scene.id, "more_emotion"),
        code: "more_emotion",
        messageKey: "studio.aiAssistant.suggestions.moreEmotion",
        patch: { sceneEnergy: recommended.sceneEnergy },
      });
    }
    if (
      recommended.cameraMovement &&
      recommended.cameraMovement !== "static" &&
      (!scene.cameraMovement?.trim() || scene.cameraMovement === "static")
    ) {
      suggestions.push({
        id: suggestionId(scene.id, "add_movement"),
        code: "add_movement",
        messageKey: "studio.aiAssistant.suggestions.addMovement",
        patch: { cameraMovement: recommended.cameraMovement },
      });
    }
  }

  if (scene.characters.length === 0 && cast.length > 0) {
    suggestions.push({
      id: suggestionId(scene.id, "focus_protagonist"),
      code: "focus_protagonist",
      messageKey: "studio.aiAssistant.suggestions.focusProtagonist",
      patch: {},
    });
  }

  if (isLast && arcPhase !== "resolution" && arcPhase !== "outro") {
    suggestions.push({
      id: suggestionId(scene.id, "stronger_finale"),
      code: "stronger_finale",
      messageKey: "studio.aiAssistant.suggestions.strongerFinale",
      patch: { sceneEnergy: "calm", shotType: scene.shotType || "medium_wide" },
    });
  }

  if (isClimax && scene.sceneEnergy !== "intense" && scene.sceneEnergy !== "dynamic") {
    suggestions.push({
      id: suggestionId(scene.id, "raise_energy"),
      code: "raise_energy",
      messageKey: "studio.aiAssistant.suggestions.raiseEnergy",
      patch: { sceneEnergy: "intense" },
    });
  }

  if (!scene.transitionToNext?.trim() && !isLast) {
    suggestions.push({
      id: suggestionId(scene.id, "better_transition"),
      code: "better_transition",
      messageKey: "studio.aiAssistant.suggestions.betterTransition",
      patch: { transitionToNext: "crossfade" },
    });
  }

  return suggestions.slice(0, 5);
}
