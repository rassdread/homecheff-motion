import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { cancelStudioJob } from "@/server/studio/studio-job-service";
import type { StudioJobCancelResponse } from "@/types/studio-job";

type RouteContext = { params: Promise<{ id: string; jobId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, jobId } = await context.params;
  const result = await cancelStudioJob(storyboardId, jobId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioJobCancelResponse = { job: result.job };
  return NextResponse.json(body, { status: 200 });
}
