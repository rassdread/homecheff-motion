import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { captureStudioActionReservation } from "@/server/studio-account/studio-credit-authorization";
import {
  allBatchesCompleted,
  lifecycleAfterBatchComplete,
  mergeProductionBatchSegments,
  nextPendingBatchIndex,
  patchBatchStatus,
  sceneIndicesForBatch,
} from "@/lib/studio-production-batch-executor";
import { PRODUCTION_TRANSACTION_HEADER } from "@/lib/studio-production-transaction";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import type { HcOrchestratorState, ProductionExecutionState } from "@/types/studio-video-production";
import { assertStoryboardSceneImagesReady } from "@/server/studio/studio-scene-image-service";
import path from "node:path";
import os from "node:os";
import { mkdir, readFile } from "node:fs/promises";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    action?: "advance" | "merge" | "complete";
    orchestrator?: HcOrchestratorState;
    hcProjectId?: string;
    batchSegmentUrl?: string;
    batchIndex?: number;
    reservationId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orchestrator = body.orchestrator;
  const execution = orchestrator?.productionExecution;
  if (!execution?.renderBatchPlan) {
    return NextResponse.json({ error: "No production execution" }, { status: 400 });
  }

  let nextExecution: ProductionExecutionState = execution;

  if (body.action === "advance") {
    const batchIndex = body.batchIndex ?? nextPendingBatchIndex(nextExecution);
    if (batchIndex === null) {
      return NextResponse.json({ ok: true, execution: nextExecution, done: false });
    }

    if (body.batchSegmentUrl) {
      nextExecution = patchBatchStatus(nextExecution, batchIndex, {
        status: "completed",
        segmentVideoUrl: body.batchSegmentUrl,
      });
    } else {
      const storyboardId = orchestrator?.storyboardId ?? "";
      if (storyboardId) {
        const imageReady = await assertStoryboardSceneImagesReady(storyboardId);
        if (!imageReady.ok) {
          return NextResponse.json(
            { ok: false, error: imageReady.error, code: imageReady.code },
            { status: 409 }
          );
        }
      }

      nextExecution = patchBatchStatus(nextExecution, batchIndex, { status: "running" });
      const sceneIndices = sceneIndicesForBatch(execution.renderBatchPlan!, batchIndex);
      const hcProjectId = body.hcProjectId ?? "";
      const productionTransactionId = orchestrator?.productionTransaction?.id ?? "";
      const hiddenImportPath =
        `/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}` +
        `&autoImport=1&hcProject=${encodeURIComponent(hcProjectId)}` +
        `&productionBatch=${batchIndex}` +
        `&sceneIndices=${encodeURIComponent(sceneIndices.join(","))}` +
        `&${PRODUCTION_TRANSACTION_HEADER}=${encodeURIComponent(productionTransactionId)}`;

      return NextResponse.json({
        ok: true,
        execution: nextExecution,
        batchIndex,
        hiddenImportPath,
        sceneIndices,
        done: false,
      });
    }

    nextExecution = {
      ...nextExecution,
      lifecycle: lifecycleAfterBatchComplete(nextExecution),
    };

    return NextResponse.json({
      ok: true,
      execution: nextExecution,
      done: allBatchesCompleted(nextExecution),
      needsMerge: allBatchesCompleted(nextExecution) && nextExecution.renderBatchPlan?.ffmpegMergeRequired,
    });
  }

  if (body.action === "merge") {
    const tmpDir = path.join(os.tmpdir(), "hc-production-merge", orchestrator?.storyboardId ?? "unknown");
    await mkdir(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, `merged-${Date.now()}.mp4`);
    const merged = await mergeProductionBatchSegments({
      execution: nextExecution,
      tmpDir,
      outputPath,
    });

    if (!merged.ok) {
      return NextResponse.json({ ok: false, error: merged.error }, { status: 500 });
    }

    let mergedVideoUrl = merged.mergedVideoUrl;
    if (!mergedVideoUrl.startsWith("http://") && !mergedVideoUrl.startsWith("https://")) {
      const bytes = await readFile(mergedVideoUrl);
      const uploaded = await uploadPublicBlob({
        pathname: `production-merge/${orchestrator?.storyboardId ?? "unknown"}/${Date.now()}.mp4`,
        body: bytes,
        contentType: "video/mp4",
        context: {
          uploadTarget: "production-merge",
          provider: "ffmpeg",
          projectId: body.hcProjectId,
        },
      });
      mergedVideoUrl = uploaded.url;
    }

    nextExecution = {
      ...nextExecution,
      lifecycle: "finishing",
      mergedVideoUrl,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      execution: nextExecution,
      mergedVideoUrl,
      finishPath: `/publish/start?hcProject=${encodeURIComponent(body.hcProjectId ?? "")}&storyboardId=${encodeURIComponent(orchestrator?.storyboardId ?? "")}&video=${encodeURIComponent(mergedVideoUrl)}&autoFinish=1`,
    });
  }

  if (body.action === "complete" && body.reservationId && orchestrator?.productionTransaction) {
    try {
      await captureStudioActionReservation({
        userId: user.id,
        reservation: {
          reservationId: body.reservationId,
          requiredCredits: orchestrator.productionTransaction.totalCredits,
          service: "studio",
          provider: "orchestrator",
          reservedCostUsd: 0,
          marginEstimate: 0,
        },
        projectId: body.hcProjectId,
        metadataJson: { productionComplete: true },
      });
    } catch {
      /* capture may fail if admin bypass */
    }

    nextExecution = { ...nextExecution, lifecycle: "completed" };
    return NextResponse.json({ ok: true, execution: nextExecution, lifecycle: "completed" });
  }

  return NextResponse.json({ ok: true, execution: nextExecution });
}
