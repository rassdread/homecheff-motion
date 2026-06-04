import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { deleteStudioSceneImage } from "@/server/studio/studio-scene-image-service";

type RouteContext = { params: Promise<{ id: string; sceneId: string; imageId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId, imageId } = await context.params;
  const result = await deleteStudioSceneImage(storyboardId, sceneId, imageId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
