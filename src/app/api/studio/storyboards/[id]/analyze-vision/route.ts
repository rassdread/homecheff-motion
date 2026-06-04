import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeStoryboardVision } from "@/server/studio/studio-vision-service";
import type { StudioStoryboardVisionAnalyzeResponse } from "@/types/studio-vision-consistency";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  const result = await analyzeStoryboardVision(storyboardId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioStoryboardVisionAnalyzeResponse = { report: result.report };
  return NextResponse.json(body, { status: 200 });
}
