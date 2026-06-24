/**
 * Studio Production Orchestrator — wires HC Workflow V2, Director, Motion handoff, Publish.
 */

import { buildStudioAnalysisPlan, createStudioWorkflowTransactionId } from "@/lib/studio-analysis-planner";
import { analyzeAudioBuffer } from "@/lib/studio-audio-analysis";
import { buildLongFormProductionPlan, resolveLongFormTargetFromSeconds } from "@/lib/studio-long-form-duration";
import { buildMusicVideoProductionPlan } from "@/lib/studio-music-video-plan";
import {
  defaultOrchestratorState,
  mapHcPhaseToUserPhase,
  orchestratorStatusFromUserPhase,
} from "@/lib/studio-orchestrator-phases";
import { analyzeVideoUploadMetadata } from "@/lib/studio-video-analysis";
import {
  detectStudioVideoIntent,
  isStudioVideoIntent,
  studioVideoIntentDefaultDuration,
  studioVideoIntentToDirectorProfile,
} from "@/lib/studio-video-intents";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type {
  HcOrchestratorState,
  StudioAnalysisPlan,
  StudioUserPhase,
  StudioVideoIntent,
  StudioWorkflowTransaction,
} from "@/types/studio-video-production";
import { readHcWorkflowV2, storeStudioWorkflowInHc, writeHcWorkflowV2 } from "@/lib/hc-workflow-v2";

export function readOrchestratorState(project: HomeCheffProjectPackage): HcOrchestratorState {
  const wf = readHcWorkflowV2(project);
  if (wf.orchestrator) {
    return { ...defaultOrchestratorState(), ...wf.orchestrator };
  }
  return defaultOrchestratorState();
}

export function writeOrchestratorState(
  project: HomeCheffProjectPackage,
  patch: Partial<HcOrchestratorState>
): HomeCheffProjectPackage {
  const current = readOrchestratorState(project);
  const next: HcOrchestratorState = {
    ...current,
    ...patch,
    status:
      patch.status ??
      orchestratorStatusFromUserPhase(
        patch.userPhase ?? current.userPhase,
        Boolean(patch.approvedAt ?? current.approvedAt)
      ),
  };
  return writeHcWorkflowV2(project, { orchestrator: next });
}

export function detectIntentFromIdea(idea: string): StudioVideoIntent | null {
  const match = detectStudioVideoIntent(idea);
  return match?.intent ?? null;
}

export function startProductionFromIntent(params: {
  project: HomeCheffProjectPackage;
  intent: StudioVideoIntent;
  idea?: string;
}): HomeCheffProjectPackage {
  let next = writeOrchestratorState(params.project, {
    intent: params.intent,
    idea: params.idea,
    userPhase: "collect",
    status: "planning",
  });
  next = storeStudioWorkflowInHc(next, {
    phase: "collect",
    idea: params.idea ?? params.intent,
    style: studioVideoIntentToDirectorProfile(params.intent),
  });
  return next;
}

export function analyzeProductionUpload(params: {
  project: HomeCheffProjectPackage;
  intent: StudioVideoIntent;
  audioBytes?: Uint8Array;
  audioExtension?: string;
  videoMeta?: { fileName?: string; fileSizeBytes: number; mimeType?: string };
  imageCount?: number;
}): { project: HomeCheffProjectPackage; analysisPlan: StudioAnalysisPlan } {
  const existingState = readOrchestratorState(params.project);
  let audioProfile = existingState.audioAnalysis;
  let videoProfile = existingState.videoAnalysis;

  if (params.audioBytes && params.audioExtension) {
    audioProfile = analyzeAudioBuffer({
      buffer: params.audioBytes,
      extension: params.audioExtension,
    });
  }
  if (params.videoMeta) {
    videoProfile = analyzeVideoUploadMetadata(params.videoMeta);
  }

  let musicVideoPlan = existingState.musicVideoPlan;
  let longFormPlan = existingState.longFormPlan;
  const photoMoviePlan = existingState.photoMoviePlan;

  if (params.intent === "music_video" && audioProfile) {
    musicVideoPlan = buildMusicVideoProductionPlan({ audioProfile });
  } else if (!photoMoviePlan) {
    const seconds =
      audioProfile?.durationSeconds ??
      videoProfile?.durationSeconds ??
      studioVideoIntentDefaultDuration(params.intent);
    longFormPlan = buildLongFormProductionPlan(resolveLongFormTargetFromSeconds(seconds));
  }

  const photoCount = photoMoviePlan?.photoCount ?? params.imageCount ?? 0;
  const persistedAssets = existingState.persistedAssets ?? [];
  const logoCount =
    existingState.logoAssetIds?.length ??
    persistedAssets.filter((a) => a.kind === "logo").length;
  const productCount =
    existingState.productAssetIds?.length ??
    persistedAssets.filter((a) => a.kind === "product_image").length;
  const hasCommercialUploads =
    Boolean(existingState.characterId?.trim()) || logoCount > 0 || productCount > 0;

  const analysisPlan = buildStudioAnalysisPlan({
    intent: params.intent,
    imageCount: params.imageCount ?? photoCount,
    photoCount,
    targetDurationSeconds:
      photoMoviePlan?.targetSeconds ??
      musicVideoPlan?.estimatedDurationSeconds ??
      longFormPlan?.targetSeconds,
    hasUploadedAudio: Boolean(audioProfile),
    hasUploadedVideo: Boolean(videoProfile),
    audioProfile: audioProfile ?? undefined,
    characterId: existingState.characterId,
    motionReadyCharacterIds: existingState.characterId ? [existingState.characterId] : [],
    logoCount,
    productCount,
    hasCommercialUploads,
  });

  const transaction: StudioWorkflowTransaction = {
    id: createStudioWorkflowTransactionId(),
    hcProjectId: params.project.id,
    intent: params.intent,
    phase: "created",
    analysisPlan,
    reservedCredits: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const project = writeOrchestratorState(params.project, {
    audioAnalysis: audioProfile,
    videoAnalysis: videoProfile,
    analysisPlan,
    videoPlanContract: analysisPlan.videoPlanContract,
    musicVideoPlan,
    longFormPlan,
    transaction,
    userPhase: "analyze",
    status: "planning",
  });

  return { project, analysisPlan };
}

export function advanceOrchestratorPhase(
  project: HomeCheffProjectPackage,
  userPhase: StudioUserPhase
): HomeCheffProjectPackage {
  const hcPhase =
    userPhase === "collect" ? "collect"
    : userPhase === "analyze" ? "analyze"
    : userPhase === "plan" ? "plan"
    : userPhase === "generate" ? "generate"
    : "generate";

  let next = writeOrchestratorState(project, {
    userPhase,
    status: orchestratorStatusFromUserPhase(userPhase, Boolean(readOrchestratorState(project).approvedAt)),
  });
  next = storeStudioWorkflowInHc(next, { phase: hcPhase });
  return next;
}

export function approveProductionPlan(project: HomeCheffProjectPackage): HomeCheffProjectPackage {
  const state = readOrchestratorState(project);
  const transaction = state.transaction
    ? {
        ...state.transaction,
        phase: "reserved" as const,
        updatedAt: new Date().toISOString(),
      }
    : undefined;

  return writeOrchestratorState(
    storeStudioWorkflowInHc(project, {
      phase: "approve",
      approvedAt: new Date().toISOString(),
    }),
    {
      approvedAt: new Date().toISOString(),
      userPhase: "generate",
      status: "generating_assets",
      transaction,
    }
  );
}

export function linkStoryboardToOrchestrator(
  project: HomeCheffProjectPackage,
  storyboardId: string,
  extras?: {
    workflowReservation?: import("@/types/studio-video-production").StudioWorkflowReservation;
    runPhase?: import("@/types/studio-video-production").StudioOrchestratorRunPhase;
    publishPath?: string;
  }
): HomeCheffProjectPackage {
  const state = readOrchestratorState(project);
  const transaction = state.transaction
    ? { ...state.transaction, storyboardId, phase: "generation_running" as const, updatedAt: new Date().toISOString() }
    : undefined;

  return writeOrchestratorState(project, {
    storyboardId,
    motionHandoffReady: true,
    motionImportUrl: `/animate/instant/import?storyboardId=${encodeURIComponent(storyboardId)}&hcProject=${encodeURIComponent(project.id)}&autoImport=1`,
    workflowReservation: extras?.workflowReservation ?? state.workflowReservation,
    runPhase: extras?.runPhase ?? "creating_scenes",
    userPhase: "generate",
    status: "rendering",
    transaction,
  });
}

export function linkCharacterToOrchestrator(
  project: HomeCheffProjectPackage,
  characterId: string
): HomeCheffProjectPackage {
  return writeOrchestratorState(project, { characterId });
}

export function buildMotionHandoffImportHref(params: {
  storyboardId: string;
  hcProjectId: string;
  autoStart?: boolean;
}): string {
  const q = new URLSearchParams({
    storyboardId: params.storyboardId,
    hcProject: params.hcProjectId,
  });
  if (params.autoStart) {
    q.set("autoImport", "1");
  }
  return `/animate/instant/import?${q.toString()}`;
}

export function buildPublishFinishHref(params: {
  hcProjectId: string;
  videoUrl?: string;
  motionProjectId?: string;
}): string {
  const q = new URLSearchParams({ hcProject: params.hcProjectId });
  if (params.videoUrl) q.set("video", params.videoUrl);
  if (params.motionProjectId) q.set("motion", params.motionProjectId);
  return `/publish/start?${q.toString()}`;
}

export function resolveIntentFromProject(project: HomeCheffProjectPackage): StudioVideoIntent | null {
  const state = readOrchestratorState(project);
  if (state.intent) return state.intent;
  const urlIntent = project.metadata?.videoIntent;
  if (typeof urlIntent === "string" && isStudioVideoIntent(urlIntent)) {
    return urlIntent;
  }
  const idea = state.idea ?? readHcWorkflowV2(project).studio?.idea;
  if (idea) return detectIntentFromIdea(idea);
  return null;
}

export function syncOrchestratorFromHcPhase(project: HomeCheffProjectPackage): HomeCheffProjectPackage {
  const hcPhase = readHcWorkflowV2(project).studio?.phase;
  if (!hcPhase) return project;
  const userPhase = mapHcPhaseToUserPhase(hcPhase);
  return writeOrchestratorState(project, { userPhase });
}

export function markProductionCompleted(project: HomeCheffProjectPackage): HomeCheffProjectPackage {
  const state = readOrchestratorState(project);
  const transaction = state.transaction
    ? { ...state.transaction, phase: "completed" as const, updatedAt: new Date().toISOString() }
    : undefined;
  return writeOrchestratorState(project, {
    userPhase: "finish",
    status: "completed",
    completedAt: new Date().toISOString(),
    transaction,
  });
}

export function reserveOrchestratorCredits(
  project: HomeCheffProjectPackage,
  reservedCredits: number
): HomeCheffProjectPackage {
  const state = readOrchestratorState(project);
  if (!state.transaction) return project;
  return writeOrchestratorState(project, {
    transaction: {
      ...state.transaction,
      phase: "reserved",
      reservedCredits,
      updatedAt: new Date().toISOString(),
    },
  });
}
