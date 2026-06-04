import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { setPreferredStudioSceneImage } from "@/server/studio/studio-scene-image-service";
import type { StudioSceneDetailResponse } from "@/types/studio-api";

type RouteContext = { params: Promise<{ id: string; sceneId: string; imageId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId, imageId } = await context.params;
  const result = await setPreferredStudioSceneImage(storyboardId, sceneId, imageId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioSceneDetailResponse = { scene: result.scene };
  return NextResponse.json(body, { status: 200 });
}
