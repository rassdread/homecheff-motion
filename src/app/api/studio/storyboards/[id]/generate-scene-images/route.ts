import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { bulkGenerateStudioStoryboardSceneImages } from "@/server/studio/studio-scene-image-service";
import type { StudioBulkSceneImageResponse } from "@/types/studio-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  const result = await bulkGenerateStudioStoryboardSceneImages(storyboardId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioBulkSceneImageResponse = { results: result.results };
  return NextResponse.json(body, { status: 200 });
}
