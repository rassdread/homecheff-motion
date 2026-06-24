import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  authorizeStudioAction,
  previewStudioCreditAuthorization,
} from "@/server/studio-account/studio-credit-authorization";
import { buildStudioAnalysisPlan, createStudioWorkflowTransactionId } from "@/lib/studio-analysis-planner";
import { isStudioVideoIntent } from "@/lib/studio-video-intents";
import { commercialAssetsPresent } from "@/server/studio/studio-commercial-scene-assign";
import type { HcOrchestratorState, StudioVideoIntent, StudioWorkflowReservation } from "@/types/studio-video-production";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    intent?: string;
    totalCredits?: number;
    hcProjectId?: string;
    orchestrator?: HcOrchestratorState;
    confirmed?: boolean;
    authorize?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intent = body.intent?.trim();
  if (!intent || !isStudioVideoIntent(intent)) {
    return NextResponse.json({ error: "Invalid intent" }, { status: 400 });
  }

  const orchestrator = body.orchestrator;
  const persistedAssets = orchestrator?.persistedAssets ?? [];
  const photoCount =
    orchestrator?.photoMoviePlan?.photoCount ??
    persistedAssets.filter((a) => a.kind === "photo" || a.kind === "photos").length;
  const logoCount =
    orchestrator?.logoAssetIds?.length ?? persistedAssets.filter((a) => a.kind === "logo").length;
  const productCount =
    orchestrator?.productAssetIds?.length ??
    persistedAssets.filter((a) => a.kind === "product_image").length;
  const characterId = orchestrator?.characterId;

  const analysisPlan = buildStudioAnalysisPlan({
    intent: intent as StudioVideoIntent,
    audioProfile: orchestrator?.audioAnalysis,
    hasUploadedAudio: Boolean(orchestrator?.audioAnalysis || orchestrator?.musicAudioUrl),
    hasUploadedVideo: Boolean(orchestrator?.videoAnalysis),
    imageCount: photoCount,
    photoCount,
    targetDurationSeconds:
      orchestrator?.photoMoviePlan?.targetSeconds ??
      orchestrator?.musicVideoPlan?.estimatedDurationSeconds ??
      orchestrator?.longFormPlan?.targetSeconds,
    logoCount,
    productCount,
    characterId,
    motionReadyCharacterIds: characterId ? [characterId] : [],
    hasCommercialUploads: orchestrator ? commercialAssetsPresent(orchestrator) : false,
  });
  const requiredCredits = body.totalCredits ?? analysisPlan.totalCredits;

  if (!body.authorize) {
    const preview = await previewStudioCreditAuthorization({
      user,
      actionType: "studio_orchestrator_production",
      overrideCredits: requiredCredits,
    });
    return NextResponse.json({
      ok: preview.allowed,
      requiredCredits,
      availableCredits: preview.balanceAfter + requiredCredits,
      analysisPlan,
      reservationPreview: preview,
    });
  }

  const auth = await authorizeStudioAction({
    user,
    actionType: "studio_orchestrator_production",
    projectId: body.hcProjectId,
    confirmed: body.confirmed ?? true,
    overrideCredits: requiredCredits,
    metadataJson: { intent, hcProjectId: body.hcProjectId },
  });

  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, code: auth.code, message: auth.message, preview: auth.preview },
      { status: 402 }
    );
  }

  const reservation: StudioWorkflowReservation = {
    id: createStudioWorkflowTransactionId(),
    reservationId: auth.reservation.reservationId,
    hcProjectId: body.hcProjectId ?? "",
    intent: intent as StudioVideoIntent,
    phase: "reserved",
    analysisCredits: analysisPlan.analysisCredits,
    renderCredits: analysisPlan.renderCredits,
    publishCredits: analysisPlan.publishCredits,
    totalCredits: requiredCredits,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    ok: true,
    requiredCredits,
    analysisPlan,
    reservation,
  });
}
