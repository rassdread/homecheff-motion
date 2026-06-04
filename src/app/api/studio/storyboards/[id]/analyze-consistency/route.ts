import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeStoryboardConsistency } from "@/server/studio/studio-consistency-service";
import type { StoryboardConsistencyReport } from "@/types/studio-consistency";

type RouteContext = { params: Promise<{ id: string }> };

export type StudioStoryboardConsistencyAnalyzeResponse = {
  report: StoryboardConsistencyReport;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await analyzeStoryboardConsistency(id, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioStoryboardConsistencyAnalyzeResponse = { report: result.report };
  return NextResponse.json(body, { status: 200 });
}
