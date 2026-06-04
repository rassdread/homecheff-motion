import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  deleteStudioScene,
  updateStudioScene,
} from "@/server/studio/studio-storyboard-service";
import type { StudioSceneDetailResponse } from "@/types/studio-api";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  let body: StudioSceneUpdateInput;
  try {
    body = (await request.json()) as StudioSceneUpdateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await updateStudioScene(storyboardId, sceneId, user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioSceneDetailResponse = { scene: result.scene };
  return NextResponse.json(response, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  const result = await deleteStudioScene(storyboardId, sceneId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
