import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { isStudioGenerationTerminal } from "@/lib/studio-generation-status";
import {
  getAuthorizedGenerationJob,
  refreshAsyncGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import { createViduMotionAdapter } from "@/server/studio-generation/vidu-motion-adapter";
import { createFakeProviderAdapter } from "@/server/studio-generation/fake-provider-adapter";

type RouteContext = { params: Promise<{ jobId: string }> };

/**
 * Poll a canonical generation job (owner-scoped).
 * For async adapters, refreshes provider status without starting a new provider job.
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { jobId } = await context.params;
  let job = await getAuthorizedGenerationJob(jobId, user.id);
  if (!job) {
    return NextResponse.json(
      { error: "Generation job not found.", code: "UNAUTHORIZED" },
      { status: 404 }
    );
  }

  if (!isStudioGenerationTerminal(job.status) && job.providerJobId) {
    if (job.providerAdapter === "vidu_motion" || job.capability === "VIDEO_GENERATE") {
      job = await refreshAsyncGenerationJob({
        job,
        adapter: createViduMotionAdapter(),
      });
    } else if (job.providerAdapter === "fake") {
      job = await refreshAsyncGenerationJob({
        job,
        adapter: createFakeProviderAdapter("async_success"),
      });
    }
  }

  return NextResponse.json({ job: toStudioGenerationUiContract(job) }, { status: 200 });
}
