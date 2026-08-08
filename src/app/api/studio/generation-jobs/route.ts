import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listGenerationJobsForOwner } from "@/server/studio-generation/generation-job-service";
import { toStudioGenerationUiContract } from "@/server/studio-generation/generation-orchestrator";
import { isStudioGenerationTerminal } from "@/lib/studio-generation-status";

/**
 * Operational generation history for a project/storyboard (S.4 — not media library).
 * Query: ?storyboardId=… or ?animationProjectId=…
 */
export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const storyboardId = url.searchParams.get("storyboardId")?.trim() || null;
  const animationProjectId = url.searchParams.get("animationProjectId")?.trim() || null;
  const limitRaw = Number(url.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 40;

  if (!storyboardId && !animationProjectId) {
    return NextResponse.json(
      { error: "storyboardId or animationProjectId is required.", code: "validation" },
      { status: 400 }
    );
  }

  const rows = await listGenerationJobsForOwner({
    ownerId: user.id,
    storyboardId,
    animationProjectId,
    limit,
  });

  return NextResponse.json({
    jobs: rows.map((job) => ({
      ...toStudioGenerationUiContract(job),
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      errorCode: job.errorCode || null,
      /** Technical retry eligible when storage failed after charge (same paid attempt). */
      technicalRetryEligible:
        job.errorCode === "STORAGE_FAILED" ||
        (job.status === "failed" && job.chargeFinalized && !job.outputAssetId),
      /** New paid generation requires a new idempotency key — never the same key. */
      newGenerationRequiresNewKey: true,
      terminal: isStudioGenerationTerminal(job.status),
    })),
  });
}
