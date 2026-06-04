import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
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

  const result = await improveSceneImageWithApproval(
    storyboardId,
    sceneId,
    body.sourceImageId,
    user,
    { autoSelect: body.autoSelect }
  );
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: ImproveSceneImageResponse = result;
  return NextResponse.json(response, { status: 201 });
}
