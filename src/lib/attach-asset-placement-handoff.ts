import { buildMotionAssetPlacementHandoffPlan } from "@/lib/studio-asset-placement-director";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachAssetPlacementToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const assetPlacementPlan = buildMotionAssetPlacementHandoffPlan(options.storyboard);

  return {
    ...payload,
    assetPlacementPlan,
    characterPlacements: assetPlacementPlan.characterPlacements,
    propPlacements: assetPlacementPlan.propPlacements,
    brandPlacements: assetPlacementPlan.brandPlacements,
    locationPlacements: assetPlacementPlan.locationPlacements,
    visualHierarchySummary: assetPlacementPlan.visualHierarchySummary,
    placementWarnings: assetPlacementPlan.placementWarnings,
  };
}
