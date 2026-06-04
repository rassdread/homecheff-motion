import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeAndPersistSceneImageVision } from "@/server/studio/studio-vision-service";
import type { StudioSceneVisionAnalyzeResponse } from "@/types/studio-vision-consistency";

type RouteContext = {
  params: Promise<{ id: string; sceneId: string; imageId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId, imageId } = await context.params;
  const result = await analyzeAndPersistSceneImageVision(
    storyboardId,
    sceneId,
    imageId,
    user
  );
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioSceneVisionAnalyzeResponse = result;
  return NextResponse.json(body, { status: 200 });
}
