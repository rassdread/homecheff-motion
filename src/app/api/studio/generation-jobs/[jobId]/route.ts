import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  getAuthorizedGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";

type RouteContext = { params: Promise<{ jobId: string }> };

/**
 * Poll a canonical generation job (owner-scoped).
 */
export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { jobId } = await context.params;
  const job = await getAuthorizedGenerationJob(jobId, user.id);
  if (!job) {
    return NextResponse.json(
      { error: "Generation job not found.", code: "UNAUTHORIZED" },
      { status: 404 }
    );
  }

  return NextResponse.json({ job: toStudioGenerationUiContract(job) }, { status: 200 });
}
