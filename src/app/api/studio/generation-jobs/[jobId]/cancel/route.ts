import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  getAuthorizedGenerationJob,
  requestGenerationJobCancellation,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import { createFakeProviderAdapter } from "@/server/studio-generation/fake-provider-adapter";

type RouteContext = { params: Promise<{ jobId: string }> };

/**
 * Request cancellation when the capability/adapter supports it.
 * Unsupported providers return 409 with honest unsupported reason (no fake terminal mapping).
 */
export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { jobId } = await context.params;
  const existing = await getAuthorizedGenerationJob(jobId, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found.", code: "UNAUTHORIZED" }, { status: 404 });
  }

  const adapter =
    existing.providerAdapter === "fake" ? createFakeProviderAdapter("async_success") : undefined;

  const result = await requestGenerationJobCancellation({
    jobId,
    ownerId: user.id,
    adapter,
  });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Not found.", code: "UNAUTHORIZED" }, { status: 404 });
    }
    if (result.reason === "unsupported") {
      return NextResponse.json(
        {
          error: "Cancellation is unavailable after provider acceptance for this action.",
          code: "CANCEL_UNSUPPORTED",
          generationJob: result.job ? toStudioGenerationUiContract(result.job) : null,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: "Job is already terminal.",
        code: "TERMINAL",
        generationJob: result.job ? toStudioGenerationUiContract(result.job) : null,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, generationJob: toStudioGenerationUiContract(result.job) });
}
