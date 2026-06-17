import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { bulkGenerateStudioStoryboardSceneImages } from "@/server/studio/studio-scene-image-service";
import type { StudioBulkSceneImageResponse } from "@/types/studio-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  return runBilledProviderRoute({
    user,
    actionType: "scene_generation",
    projectId: storyboardId,
    execute: () => bulkGenerateStudioStoryboardSceneImages(storyboardId, user),
    isFailure: (result) => "error" in result,
    buildCostEvent: (result) =>
      "error" in result
        ? null
        : {
            provider: "openai",
            costActionType: "openai_scene_image",
            unitType: "request",
            unitsUsed: Math.max(1, result.results.length),
            unitCostUsd: 0.04,
            userId: user.id,
            projectId: storyboardId,
            status: "completed",
            metadataJson: { feature: "scene_image_bulk" },
          },
    onSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error.message, code: result.error.code },
          { status: result.error.httpStatus }
        );
      }
      const body: StudioBulkSceneImageResponse = { results: result.results };
      return NextResponse.json(withEstimatedCredits(body, estimatedCredits), { status: 200 });
    },
  });
}
