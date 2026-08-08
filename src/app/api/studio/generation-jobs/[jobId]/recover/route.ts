import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  getAuthorizedGenerationJob,
  technicalRetryGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";

type RouteContext = { params: Promise<{ jobId: string }> };

/**
 * Recover after provider/render success but Studio storage/attachment failure.
 * Technical retry of the same paid attempt — does not recharge when chargeFinalized.
 */
export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { jobId } = await context.params;
  const existing = await getAuthorizedGenerationJob(jobId, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found.", code: "UNAUTHORIZED" }, { status: 404 });
  }

  let outputAssetId: string | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as { outputAssetId?: string };
    outputAssetId =
      typeof body.outputAssetId === "string" && body.outputAssetId.trim() ?
        body.outputAssetId.trim().slice(0, 512)
      : null;
  } catch {
    /* empty */
  }

  const recoveredAsset =
    outputAssetId ||
    (typeof existing.metadataJson === "object" &&
    existing.metadataJson &&
    !Array.isArray(existing.metadataJson) &&
    typeof (existing.metadataJson as { providerResultAssetId?: unknown }).providerResultAssetId ===
      "string"
      ? String((existing.metadataJson as { providerResultAssetId: string }).providerResultAssetId)
      : null);

  if (!recoveredAsset) {
    return NextResponse.json(
      {
        error: "No recoverable provider result available. Do not start a new paid generation.",
        code: "RECOVERY_UNAVAILABLE",
        generationJob: toStudioGenerationUiContract(existing),
        chargeFinalized: existing.chargeFinalized,
      },
      { status: 409 }
    );
  }

  const chargeBefore = existing.chargeFinalized;
  const creditsBefore = existing.creditsCharged;

  const result = await technicalRetryGenerationJob({
    jobId,
    ownerId: user.id,
    reprocess: async () => ({
      ok: true as const,
      outputAssetId: recoveredAsset,
      metadata: {
        ...(typeof existing.metadataJson === "object" && existing.metadataJson && !Array.isArray(existing.metadataJson)
          ? (existing.metadataJson as Record<string, unknown>)
          : {}),
        recoveredAt: new Date().toISOString(),
        recoveryPath: "storage_reattach",
      },
    }),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.job.errorMessageSafe || "Recovery failed.",
        code: result.errorCode,
        generationJob: toStudioGenerationUiContract(result.job),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    generationJob: toStudioGenerationUiContract(result.job),
    chargeFinalizedUnchanged: chargeBefore === result.job.chargeFinalized,
    creditsChargedUnchanged: creditsBefore === result.job.creditsCharged,
    recharged: false,
  });
}
