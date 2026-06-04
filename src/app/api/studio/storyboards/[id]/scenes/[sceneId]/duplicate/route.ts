import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { duplicateStudioScene } from "@/server/studio/studio-storyboard-service";
import type { StudioSceneDetailResponse } from "@/types/studio-api";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  const result = await duplicateStudioScene(storyboardId, sceneId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioSceneDetailResponse = { scene: result.scene };
  return NextResponse.json(response, { status: 201 });
}
