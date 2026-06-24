import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  authorizeStudioAction,
  refundStudioActionReservation,
} from "@/server/studio-account/studio-credit-authorization";
import { runOrchestratorPremiumAnalysis } from "@/server/studio/studio-orchestrator-premium-analysis";
import { bootstrapStoryboardFromOrchestrator } from "@/server/studio/studio-orchestrator-bootstrap";
import { assignPhotoUrlsToStoryboardScenes } from "@/server/studio/studio-photo-scene-assign";
import {
  assignCommercialAssetsToStoryboardScenes,
  commercialAssetsPresent,
} from "@/server/studio/studio-commercial-scene-assign";
import { ensureStoryboardSceneImagesForProduction } from "@/server/studio/studio-scene-image-service";
import { uploadStoryboardExternalAudio } from "@/server/studio/upload-storyboard-external-audio";
import { createStudioWorkflowTransactionId } from "@/lib/studio-analysis-planner";
import { buildStudioAnalysisPlan } from "@/lib/studio-analysis-planner";
import { isStudioVideoIntent } from "@/lib/studio-video-intents";
import { createProductionTransactionFromReservation } from "@/lib/studio-production-transaction";
import { resolveApprovedRenderBatchPlan } from "@/lib/studio-orchestrator-approved-plan";
import {
  initProductionExecution,
} from "@/lib/studio-production-batch-plan";
import type { HcOrchestratorState, StudioWorkflowReservation } from "@/types/studio-video-production";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    orchestrator?: HcOrchestratorState;
    hcProjectId?: string;
    idea?: string;
    characterId?: string;
    confirmed?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orchestrator = body.orchestrator;
  if (!orchestrator?.intent || !isStudioVideoIntent(orchestrator.intent)) {
    return NextResponse.json({ error: "Invalid orchestrator state" }, { status: 400 });
  }

  if (orchestrator.intent === "product_commercial" && !commercialAssetsPresent(orchestrator)) {
    return NextResponse.json(
      { ok: false, error: "Upload a logo or product image for this commercial.", code: "COMMERCIAL_ASSETS_REQUIRED" },
      { status: 400 }
    );
  }

  if (orchestrator.intent === "music_video" && !orchestrator.musicAudioUrl && !orchestrator.audioAnalysis) {
    return NextResponse.json(
      { ok: false, error: "Upload your music track to create a music video.", code: "MUSIC_REQUIRED" },
      { status: 400 }
    );
  }

  const analysisPlan =
    orchestrator.analysisPlan ??
    buildStudioAnalysisPlan({
      intent: orchestrator.intent,
      audioProfile: orchestrator.audioAnalysis,
      hasUploadedAudio: Boolean(orchestrator.audioAnalysis || orchestrator.musicAudioUrl),
      hasUploadedVideo: Boolean(orchestrator.videoAnalysis),
      imageCount:
        orchestrator.persistedAssets?.filter((a) => a.kind === "photo" || a.kind === "photos")
          .length ?? 0,
      photoCount: orchestrator.photoMoviePlan?.photoCount,
      targetDurationSeconds:
        orchestrator.photoMoviePlan?.targetSeconds ??
        orchestrator.musicVideoPlan?.estimatedDurationSeconds ??
        orchestrator.longFormPlan?.targetSeconds,
      logoCount:
        orchestrator.logoAssetIds?.length ??
        orchestrator.persistedAssets?.filter((a) => a.kind === "logo").length ??
        0,
      productCount:
        orchestrator.productAssetIds?.length ??
        orchestrator.persistedAssets?.filter((a) => a.kind === "product_image").length ??
        0,
      characterId: body.characterId ?? orchestrator.characterId,
      motionReadyCharacterIds: orchestrator.characterId ? [orchestrator.characterId] : [],
      hasCommercialUploads: commercialAssetsPresent(orchestrator),
    });

  const auth = await authorizeStudioAction({
    user,
    actionType: "studio_orchestrator_production",
    projectId: body.hcProjectId,
    confirmed: body.confirmed ?? true,
    overrideCredits: analysisPlan.totalCredits,
    metadataJson: {
      intent: orchestrator.intent,
      hcProjectId: body.hcProjectId,
      phase: "orchestrator_run",
      productionChain: true,
    },
  });

  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: auth.code,
        message: auth.message,
        preview: auth.preview,
      },
      { status: 402 }
    );
  }

  const reservation: StudioWorkflowReservation = {
    id: createStudioWorkflowTransactionId(),
    reservationId: auth.reservation.reservationId,
    hcProjectId: body.hcProjectId ?? "",
    intent: orchestrator.intent,
    phase: "analysis_running",
    analysisCredits: analysisPlan.analysisCredits,
    renderCredits: analysisPlan.renderCredits,
    publishCredits: analysisPlan.publishCredits,
    totalCredits: analysisPlan.totalCredits,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const premiumAnalysis = await runOrchestratorPremiumAnalysis({
    viewer: user,
    characterId: body.characterId ?? orchestrator.characterId,
  });

  if (!premiumAnalysis.analysisComplete) {
    if (!auth.adminBypass && auth.reservation.reservationId !== "admin-bypass") {
      await refundStudioActionReservation({
        userId: user.id,
        reservation: auth.reservation,
        projectId: body.hcProjectId,
        failedGeneration: true,
        metadataJson: { reason: "Premium analysis failed" },
      });
    }
    return NextResponse.json(
      { ok: false, error: "Content learning could not complete.", code: "ANALYSIS_FAILED" },
      { status: 400 }
    );
  }

  reservation.phase = "analysis_complete";
  reservation.updatedAt = new Date().toISOString();

  const bootstrap = await bootstrapStoryboardFromOrchestrator({
    viewer: user,
    orchestrator,
    idea: body.idea,
    characterId: body.characterId ?? orchestrator.characterId,
  });

  if (!bootstrap.ok) {
    if (!auth.adminBypass && auth.reservation.reservationId !== "admin-bypass") {
      await refundStudioActionReservation({
        userId: user.id,
        reservation: auth.reservation,
        projectId: body.hcProjectId,
        failedGeneration: true,
        metadataJson: { reason: bootstrap.error },
      });
    }
    return NextResponse.json({ ok: false, error: bootstrap.error, code: bootstrap.code }, { status: 400 });
  }

  reservation.storyboardId = bootstrap.storyboardId;
  reservation.phase = "generation_running";
  reservation.updatedAt = new Date().toISOString();

  const photoUrls =
    orchestrator.persistedAssets
      ?.filter((a) => a.kind === "photo" || a.kind === "photos")
      .map((a) => a.url) ?? [];
  if (photoUrls.length > 0) {
    await assignPhotoUrlsToStoryboardScenes({
      storyboardId: bootstrap.storyboardId,
      viewer: user,
      photoUrls,
    });
  }

  const logoUrl =
    orchestrator.persistedAssets?.find((a) => a.kind === "logo")?.url ?? "";
  const productUrls =
    orchestrator.persistedAssets
      ?.filter((a) => a.kind === "product_image")
      .map((a) => a.url) ?? [];
  if (logoUrl || productUrls.length > 0) {
    const commercial = await assignCommercialAssetsToStoryboardScenes({
      storyboardId: bootstrap.storyboardId,
      viewer: user,
      logoUrl: logoUrl || undefined,
      productUrls,
    });
    if (!commercial.ok) {
      if (!auth.adminBypass && auth.reservation.reservationId !== "admin-bypass") {
        await refundStudioActionReservation({
          userId: user.id,
          reservation: auth.reservation,
          projectId: body.hcProjectId,
          failedGeneration: true,
          metadataJson: { reason: commercial.error },
        });
      }
      return NextResponse.json({ ok: false, error: commercial.error, code: "COMMERCIAL_ASSIGN_FAILED" }, { status: 400 });
    }
  }

  const sceneImages = await ensureStoryboardSceneImagesForProduction({
    storyboardId: bootstrap.storyboardId,
    viewer: user,
  });
  if (!sceneImages.ok) {
    if (!auth.adminBypass && auth.reservation.reservationId !== "admin-bypass") {
      await refundStudioActionReservation({
        userId: user.id,
        reservation: auth.reservation,
        projectId: body.hcProjectId,
        failedGeneration: true,
        metadataJson: { reason: sceneImages.error },
      });
    }
    return NextResponse.json(
      { ok: false, error: sceneImages.error, code: sceneImages.code ?? "SCENE_IMAGES_FAILED" },
      { status: 400 }
    );
  }

  if (orchestrator.musicAudioUrl) {
    try {
      const audioRes = await fetch(orchestrator.musicAudioUrl);
      if (audioRes.ok) {
        const buffer = Buffer.from(await audioRes.arrayBuffer());
        await uploadStoryboardExternalAudio({
          storyboardId: bootstrap.storyboardId,
          viewer: user,
          audioBuffer: buffer,
          fileName: "production-music.mp3",
          mimeType: "audio/mpeg",
          displayName: "Production music",
        });
      }
    } catch {
      /* non-fatal */
    }
  }

  const renderBatchPlan = resolveApprovedRenderBatchPlan(orchestrator);

  const productionExecution = renderBatchPlan
    ? initProductionExecution({
        renderBatchPlan,
        musicAudioUrl: orchestrator.musicAudioUrl,
      })
    : undefined;

  const productionTransaction = createProductionTransactionFromReservation({
    reservation: { ...reservation, storyboardId: bootstrap.storyboardId },
    contractId: analysisPlan.videoPlanContract?.id ?? orchestrator.videoPlanContract?.id,
    mergeCredits: renderBatchPlan?.ffmpegMergeRequired ? 2 : 0,
    finishingCredits: analysisPlan.publishCredits,
  });

  // Single billing chain: reserve only — capture after production completes.
  // Do NOT capture here; Motion/Publish consume via productionTransaction bypass.

  const hcProjectId = body.hcProjectId ?? "";
  const productionPath = `/studio/production?hcProject=${encodeURIComponent(hcProjectId)}&storyboardId=${encodeURIComponent(bootstrap.storyboardId)}`;
  const finishPath = `/publish/start?hcProject=${encodeURIComponent(hcProjectId)}&storyboardId=${encodeURIComponent(bootstrap.storyboardId)}&autoFinish=1`;

  return NextResponse.json({
    ok: true,
    runPhase: "rendering_video" as const,
    lifecycle: "rendering" as const,
    storyboardId: bootstrap.storyboardId,
    sceneCount: bootstrap.sceneCount,
    title: bootstrap.title,
    reservation,
    productionTransaction,
    productionExecution,
    renderBatchPlan,
    productionPath,
    finishPath,
    publishPath: finishPath,
    analysisPlan,
    videoPlanContract: analysisPlan.videoPlanContract ?? orchestrator.videoPlanContract,
  });
}
