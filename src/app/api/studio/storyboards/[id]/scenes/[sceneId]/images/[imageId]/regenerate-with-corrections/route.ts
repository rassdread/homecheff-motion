import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { regenerateStudioSceneImageWithCorrections } from "@/server/studio/studio-scene-image-service";
import type { RegenerateWithCorrectionsResponse } from "@/types/studio-correction";

type RouteContext = {
  params: Promise<{ id: string; sceneId: string; imageId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId, imageId } = await context.params;
  const result = await regenerateStudioSceneImageWithCorrections(
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

  const body: RegenerateWithCorrectionsResponse = result;
  return NextResponse.json(body, { status: 201 });
}
