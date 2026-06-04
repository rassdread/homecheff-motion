import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { previewSceneCorrections } from "@/server/studio/studio-correction-service";
import type { SceneCorrectionPreviewResponse } from "@/types/studio-correction";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  const sourceImageId = request.nextUrl.searchParams.get("sourceImageId") ?? undefined;

  const result = await previewSceneCorrections(storyboardId, sceneId, sourceImageId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: { preview: SceneCorrectionPreviewResponse } = result;
  return NextResponse.json(body, { status: 200 });
}
