import { buildMotionSceneCompositionHandoffPlan } from "@/lib/studio-scene-composition-director";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachSceneCompositionToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const sceneCompositionPlan = buildMotionSceneCompositionHandoffPlan(options.storyboard);

  return {
    ...payload,
    sceneCompositionPlan,
    characterPlacementPlans: sceneCompositionPlan.characterPlacementPlans,
    propPlacementPlans: sceneCompositionPlan.propPlacementPlans,
    brandPlacementPlans: sceneCompositionPlan.brandPlacementPlans,
    locationCompositionPlans: sceneCompositionPlan.locationCompositionPlans,
    visualFocusSummary: sceneCompositionPlan.visualFocusSummary,
    compositionWarnings: sceneCompositionPlan.compositionWarnings,
  };
}
