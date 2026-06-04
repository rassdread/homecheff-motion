import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { parseStudioJobCreateBody } from "@/lib/studio-job-validation";
import { planStudioJobScenes } from "@/server/studio/studio-job-plan";
import { createStudioJob, listStudioJobsForStoryboard } from "@/server/studio/studio-job-service";
import { scheduleStudioJobRun } from "@/server/studio/studio-job-runner";
import type { StudioJobCreateResponse, StudioJobListResponse } from "@/types/studio-job";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  const result = await listStudioJobsForStoryboard(storyboardId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioJobListResponse = { jobs: result.jobs };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = parseStudioJobCreateBody(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid job type or body.", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const planned = await planStudioJobScenes(storyboardId, parsed.type, parsed.input);
  if (planned.length === 0) {
    return NextResponse.json(
      { error: "No scenes to process for this job.", code: "NO_SCENES" },
      { status: 400 }
    );
  }

  const created = await createStudioJob(
    storyboardId,
    parsed.type,
    parsed.input,
    user,
    planned.length
  );
  if ("error" in created) {
    return NextResponse.json(
      { error: created.error.message, code: created.error.code },
      { status: created.error.httpStatus }
    );
  }

  scheduleStudioJobRun(created.job.id);

  const body: StudioJobCreateResponse = { job: created.job };
  return NextResponse.json(body, { status: 201 });
}
