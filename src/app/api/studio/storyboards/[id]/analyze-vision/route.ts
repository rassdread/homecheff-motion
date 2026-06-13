import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import { analyzeStoryboardVision } from "@/server/studio/studio-vision-service";
import type { StudioStoryboardVisionAnalyzeResponse } from "@/types/studio-vision-consistency";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  let confirmed = false;
  try {
    const body = (await request.json().catch(() => ({}))) as { confirmed?: boolean };
    confirmed = body.confirmed === true;
  } catch {
    /* empty body ok */
  }

  const gated = await withStudioCreditGate({
    user,
    actionType: "vision_analysis",
    projectId: storyboardId,
    confirmed,
    execute: () => analyzeStoryboardVision(storyboardId, user),
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

  const body: StudioStoryboardVisionAnalyzeResponse = { report: result.report };
  return NextResponse.json(body, { status: 200 });
}
