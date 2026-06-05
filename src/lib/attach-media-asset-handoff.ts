import { buildMotionMediaAssetHandoffPlan } from "@/lib/studio-media-asset-director";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachMediaAssetToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const mediaAssetPlan = buildMotionMediaAssetHandoffPlan(options.storyboard);

  return {
    ...payload,
    mediaAssetPlan,
    assetReferences: mediaAssetPlan.assetReferences,
    assetCollections: mediaAssetPlan.assetCollections,
    assetUsageSummary: mediaAssetPlan.assetUsageSummary,
  };
}
