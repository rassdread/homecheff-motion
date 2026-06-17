import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { improveSceneImageWithApproval } from "@/server/studio/studio-improvement-service";
import type { ImproveSceneImageResponse } from "@/types/studio-improvement";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    sourceImageId?: string;
    autoSelect?: boolean;
  };

  return runBilledProviderRoute({
    user,
    actionType: "scene_generation",
    projectId: storyboardId,
    execute: () =>
      improveSceneImageWithApproval(storyboardId, sceneId, body.sourceImageId, user, {
        autoSelect: body.autoSelect,
      }),
    isFailure: (result) => "error" in result,
    onSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error.message, code: result.error.code },
          { status: result.error.httpStatus }
        );
      }
      const response: ImproveSceneImageResponse = result;
      return NextResponse.json(withEstimatedCredits(response, estimatedCredits), { status: 201 });
    },
  });
}
