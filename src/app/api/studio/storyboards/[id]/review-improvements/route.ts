import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getStoryboardImprovementSummary } from "@/server/studio/studio-improvement-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  const result = await getStoryboardImprovementSummary(storyboardId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ summary: result.summary }, { status: 200 });
}
