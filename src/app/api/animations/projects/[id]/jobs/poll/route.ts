import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForOwner } from "@/server/animation-projects/queries";
import { pollProjectJobs } from "@/server/animation-jobs/service";
import { listGenerationJobsForOwner } from "@/server/studio-generation/generation-job-service";
import {
  refreshAsyncGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import { createViduMotionAdapter } from "@/server/studio-generation/vidu-motion-adapter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Poll Motion transitions and refresh linked StudioGenerationJob status.
 * UI should prefer generationJob.status over provider-native enums.
 */
export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const project = await getAnimationProjectByIdForOwner(id, user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const result = await pollProjectJobs(id);
    const jobs = await listGenerationJobsForOwner({
      ownerId: user.id,
      animationProjectId: id,
      limit: 5,
    });
    const active =
      jobs.find((j) => j.status !== "succeeded" && j.status !== "failed" && j.status !== "cancelled") ??
      jobs[0] ??
      null;

    let generationJob = active;
    if (active?.providerJobId) {
      generationJob = await refreshAsyncGenerationJob({
        job: active,
        adapter: createViduMotionAdapter(),
      });
    }

    return NextResponse.json(
      {
        ...result,
        generationJob: generationJob ? toStudioGenerationUiContract(generationJob) : null,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to poll jobs." },
      { status: 400 }
    );
  }
}
