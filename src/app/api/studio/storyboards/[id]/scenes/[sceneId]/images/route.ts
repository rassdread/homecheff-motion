import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
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

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  const result = await generateStudioSceneImage(storyboardId, sceneId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioSceneImageDetailResponse = { image: result.image };
  return NextResponse.json(body, { status: 201 });
}
