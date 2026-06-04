import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { createStudioScene } from "@/server/studio/studio-storyboard-service";
import type { StudioSceneDetailResponse } from "@/types/studio-api";
import type { StudioSceneCreateInput } from "@/lib/studio-scene-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  let body: StudioSceneCreateInput;
  try {
    body = (await request.json()) as StudioSceneCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const result = await createStudioScene(storyboardId, user, body);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const response: StudioSceneDetailResponse = { scene: result.scene };
  return NextResponse.json(response, { status: 201 });
}
