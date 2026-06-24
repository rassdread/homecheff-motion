import { NextResponse } from "next/server";
import { buildStudioAnalysisPlan } from "@/lib/studio-analysis-planner";
import { analyzeAudioBuffer } from "@/lib/studio-audio-analysis";
import { isStudioVideoIntent } from "@/lib/studio-video-intents";
import { commercialAssetsPresent } from "@/server/studio/studio-commercial-scene-assign";
import type { HcOrchestratorState, StudioVideoIntent } from "@/types/studio-video-production";

export async function POST(request: Request) {
  let body: {
    intent?: string;
    imageCount?: number;
    photoCount?: number;
    targetDurationSeconds?: number;
    hasUploadedVideo?: boolean;
    cachedAnalysisSources?: string[];
    audioBase64?: string;
    audioExtension?: string;
    characterId?: string;
    logoCount?: number;
    productCount?: number;
    orchestrator?: HcOrchestratorState;
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
  let audioProfile = orchestrator?.audioAnalysis;
  if (body.audioBase64 && body.audioExtension) {
    const buffer = Buffer.from(body.audioBase64, "base64");
    audioProfile = analyzeAudioBuffer({ buffer, extension: body.audioExtension });
  }

  const persistedAssets = orchestrator?.persistedAssets ?? [];
  const photoCount =
    body.photoCount ??
    orchestrator?.photoMoviePlan?.photoCount ??
    body.imageCount ??
    persistedAssets.filter((a) => a.kind === "photo" || a.kind === "photos").length;
  const logoCount =
    body.logoCount ??
    orchestrator?.logoAssetIds?.length ??
    persistedAssets.filter((a) => a.kind === "logo").length;
  const productCount =
    body.productCount ??
    orchestrator?.productAssetIds?.length ??
    persistedAssets.filter((a) => a.kind === "product_image").length;
  const characterId = body.characterId ?? orchestrator?.characterId;

  const analysisPlan = buildStudioAnalysisPlan({
    intent: intent as StudioVideoIntent,
    imageCount: body.imageCount ?? photoCount,
    photoCount,
    targetDurationSeconds:
      body.targetDurationSeconds ??
      orchestrator?.photoMoviePlan?.targetSeconds ??
      orchestrator?.musicVideoPlan?.estimatedDurationSeconds ??
      orchestrator?.longFormPlan?.targetSeconds,
    hasUploadedAudio: Boolean(audioProfile ?? orchestrator?.musicAudioUrl),
    hasUploadedVideo: body.hasUploadedVideo ?? Boolean(orchestrator?.videoAnalysis),
    audioProfile: audioProfile ?? undefined,
    cachedAnalysisSources: body.cachedAnalysisSources,
    characterId,
    motionReadyCharacterIds: characterId ? [characterId] : [],
    logoCount,
    productCount,
    hasCommercialUploads: orchestrator ? commercialAssetsPresent(orchestrator) : logoCount > 0 || productCount > 0,
  });

  return NextResponse.json({ analysisPlan, audioProfile: audioProfile ?? null });
}
