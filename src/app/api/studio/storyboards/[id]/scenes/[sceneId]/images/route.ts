import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import {
  generateStudioSceneImage,
  listStudioSceneImages,
} from "@/server/studio/studio-scene-image-service";
import type {
  StudioSceneImageDetailResponse,
  StudioSceneImageListResponse,
} from "@/types/studio-api";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  const result = await listStudioSceneImages(storyboardId, sceneId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioSceneImageListResponse = { images: result.images };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  let confirmed = false;
  try {
    const body = (await request.json().catch(() => ({}))) as { confirmed?: boolean };
    confirmed = body.confirmed === true;
  } catch {
    /* empty body ok */
  }

  const gated = await withStudioCreditGate({
    user,
    actionType: "scene_generation",
    projectId: storyboardId,
    confirmed,
    execute: () => generateStudioSceneImage(storyboardId, sceneId, user),
    isFailure: (result) => "error" in result,
  });

  if ("blocked" in gated) {
    return gated.blocked;
  }

  const result = gated.result;
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioSceneImageDetailResponse = { image: result.image };
  return NextResponse.json(body, { status: 201 });
}
